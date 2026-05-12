import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { randomInt, randomUUID } from 'crypto';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';

const HEADER_FULL_NAME = 'ФИО';
const HEADER_EMAIL = 'email';
const HEADER_GROUP = 'группа';
const HEADER_PASSWORD = 'пароль';
const SHEET_NAME = 'Студенты';

const CSV_REQUIRED_HEADERS = [HEADER_FULL_NAME, HEADER_EMAIL, HEADER_GROUP] as const;
const MAX_CREDENTIAL_FILE_AGE_MS = 1000 * 60 * 30;

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  group: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type ParsedCsvRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  group: string;
  errors: string[];
};

type ValidCsvRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  group: string;
};

type ParsedStudentImport = {
  headers: string[];
  rows: ParsedCsvRow[];
  validRows: ValidCsvRow[];
};

type StoredCredentialsFile = {
  ownerUserId: string;
  fileName: string;
  content: Buffer;
  createdAt: number;
};

export type StudentImportPreviewRow = {
  rowNumber: number;
  fullName: string;
  email: string;
  group: string;
  isValid: boolean;
  errors: string[];
};

export type StudentImportPreview = {
  headers: string[];
  requiredHeaders: ReadonlyArray<string>;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  hasErrors: boolean;
  rows: StudentImportPreviewRow[];
};

export type StudentImportSummary = {
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  enrolledCount: number;
};

export type StudentImportResult = {
  summary: StudentImportSummary;
  downloadId: string;
  downloadFileName: string;
};

export type StudentImportOptions = {
  importedById: string;
  courseId?: string;
  enrollToCourse?: boolean;
};

@Injectable()
export class StudentImportService {
  private readonly credentialsFiles = new Map<string, StoredCredentialsFile>();

  constructor(private readonly prisma: PrismaService) {}

  async preview(buffer: Buffer): Promise<StudentImportPreview> {
    const parsed = await this.parseAndValidate(buffer);
    return this.toPreview(parsed);
  }

  async importStudents(
    buffer: Buffer,
    options: StudentImportOptions,
  ): Promise<StudentImportResult> {
    const parsed = await this.parseAndValidate(buffer);
    const preview = this.toPreview(parsed);

    if (preview.hasErrors) {
      throw new BadRequestException({
        message: 'Импорт невозможен: исправьте ошибки в CSV-файле.',
        rows: preview.rows.filter((row) => !row.isValid).slice(0, 50),
      });
    }

    if (parsed.validRows.length === 0) {
      throw new BadRequestException('CSV-файл не содержит строк для импорта.');
    }

    const preparedRows = await Promise.all(
      parsed.validRows.map(async (row) => {
        const password = this.generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);

        return {
          ...row,
          password,
          passwordHash,
        };
      }),
    );

    let transactionResult: {
      createdStudents: Array<{
        user: Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
        password: string;
      }>;
      enrolledCount: number;
    };

    try {
      transactionResult = await this.prisma.$transaction(async (tx) => {
        const createdStudents: Array<{
          user: Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
          password: string;
        }> = [];

        for (const row of preparedRows) {
          const user = await tx.user.create({
            data: {
              email: row.email,
              passwordHash: row.passwordHash,
              fullName: row.fullName,
              group: row.group,
              role: UserRole.STUDENT,
            },
            select: publicUserSelect,
          });

          createdStudents.push({
            user,
            password: row.password,
          });
        }

        let enrolledCount = 0;

        if (options.enrollToCourse && options.courseId && createdStudents.length > 0) {
          const result = await tx.enrollment.createMany({
            data: createdStudents.map((student) => ({
              courseId: options.courseId!,
              studentId: student.user.id,
              status: EnrollmentStatus.ACTIVE,
            })),
            skipDuplicates: true,
          });

          enrolledCount = result.count;
        }

        return {
          createdStudents,
          enrolledCount,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Некоторые email уже существуют в системе. Обновите CSV и попробуйте снова.',
        );
      }

      throw error;
    }

    const workbookBuffer = this.buildCredentialsWorkbook(
      transactionResult.createdStudents.map((item) => ({
        fullName: item.user.fullName,
        email: item.user.email,
        password: item.password,
      })),
    );

    const fileName = this.buildWorkbookFileName();
    const downloadId = this.storeCredentialsFile({
      ownerUserId: options.importedById,
      fileName,
      content: workbookBuffer,
    });

    return {
      summary: {
        totalRows: parsed.rows.length,
        createdCount: transactionResult.createdStudents.length,
        skippedCount: 0,
        failedCount: 0,
        enrolledCount: transactionResult.enrolledCount,
      },
      downloadId,
      downloadFileName: fileName,
    };
  }

  getCredentialsFile(downloadId: string, currentUserId: string) {
    this.cleanupExpiredFiles();

    const file = this.credentialsFiles.get(downloadId);
    if (!file) {
      throw new NotFoundException('Файл с результатами импорта не найден или уже недоступен.');
    }

    if (file.ownerUserId !== currentUserId) {
      throw new ForbiddenException('Нет доступа к этому файлу результатов.');
    }

    return {
      fileName: file.fileName,
      content: file.content,
    };
  }

  private async parseAndValidate(buffer: Buffer): Promise<ParsedStudentImport> {
    const csvText = this.decodeCsvBuffer(buffer);

    const rawLines = csvText.split(/\r?\n/);
    while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim().length === 0) {
      rawLines.pop();
    }

    const headerLineIndex = rawLines.findIndex((line) => line.trim().length > 0);
    if (headerLineIndex === -1) {
      throw new BadRequestException('CSV-файл пуст.');
    }

    const headerLine = rawLines[headerLineIndex];
    const delimiter = this.detectDelimiter(headerLine);
    const headers = this.parseCsvLine(headerLine, delimiter).map((value) =>
      value.trim().replace(/^\uFEFF/, ''),
    );

    const headerIndexMap = new Map<string, number>();
    headers.forEach((header, index) => {
      headerIndexMap.set(this.normalizeHeader(header), index);
    });

    const fullNameIndex = headerIndexMap.get(this.normalizeHeader(HEADER_FULL_NAME));
    const emailIndex = headerIndexMap.get(this.normalizeHeader(HEADER_EMAIL));
    const groupIndex = headerIndexMap.get(this.normalizeHeader(HEADER_GROUP));

    const missingHeaders: string[] = [];
    if (fullNameIndex === undefined) missingHeaders.push(HEADER_FULL_NAME);
    if (emailIndex === undefined) missingHeaders.push(HEADER_EMAIL);
    if (groupIndex === undefined) missingHeaders.push(HEADER_GROUP);

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `В CSV отсутствуют обязательные колонки: ${missingHeaders.join(', ')}`,
      );
    }

    const resolvedFullNameIndex = fullNameIndex as number;
    const resolvedEmailIndex = emailIndex as number;
    const resolvedGroupIndex = groupIndex as number;

    const rows: ParsedCsvRow[] = [];

    for (let lineIndex = headerLineIndex + 1; lineIndex < rawLines.length; lineIndex += 1) {
      const line = rawLines[lineIndex];
      if (line.trim().length === 0) {
        continue;
      }

      const cells = this.parseCsvLine(line, delimiter);
      const fullNameRaw = cells[resolvedFullNameIndex] ?? '';
      const emailRaw = cells[resolvedEmailIndex] ?? '';
      const groupRaw = cells[resolvedGroupIndex] ?? '';

      const fullName = this.normalizeTextField(fullNameRaw);
      const email = emailRaw.trim().toLowerCase();
      const group = this.normalizeTextField(groupRaw);

      const errors: string[] = [];

      if (!fullName) {
        errors.push('Поле «ФИО» обязательно.');
      }

      if (!email) {
        errors.push('Поле «email» обязательно.');
      } else if (!isEmail(email)) {
        errors.push('Некорректный email.');
      }

      if (!group) {
        errors.push('Поле «группа» обязательно.');
      }

      rows.push({
        rowNumber: lineIndex + 1,
        fullName,
        email,
        group,
        errors,
      });
    }

    if (rows.length === 0) {
      throw new BadRequestException('CSV-файл не содержит данных для импорта.');
    }

    const emailOccurrences = new Map<string, number>();
    for (const row of rows) {
      if (row.email && isEmail(row.email)) {
        emailOccurrences.set(row.email, (emailOccurrences.get(row.email) ?? 0) + 1);
      }
    }

    for (const row of rows) {
      if (row.email && isEmail(row.email) && (emailOccurrences.get(row.email) ?? 0) > 1) {
        row.errors.push('Дублирующийся email внутри CSV-файла.');
      }
    }

    const candidateEmails = Array.from(
      new Set(rows.filter((row) => row.email && isEmail(row.email)).map((row) => row.email)),
    );

    if (candidateEmails.length > 0) {
      const existingUsers = await this.prisma.user.findMany({
        where: {
          email: {
            in: candidateEmails,
          },
        },
        select: { email: true },
      });

      const existingEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));

      for (const row of rows) {
        if (row.email && existingEmails.has(row.email)) {
          row.errors.push('Пользователь с таким email уже существует.');
        }
      }
    }

    const validRows: ValidCsvRow[] = rows
      .filter((row) => row.errors.length === 0)
      .map((row) => ({
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        email: row.email,
        group: row.group,
      }));

    return {
      headers,
      rows,
      validRows,
    };
  }

  private toPreview(parsed: ParsedStudentImport): StudentImportPreview {
    const previewRows = parsed.rows.map((row) => {
      const errors = Array.from(new Set(row.errors));
      return {
        rowNumber: row.rowNumber,
        fullName: row.fullName,
        email: row.email,
        group: row.group,
        isValid: errors.length === 0,
        errors,
      };
    });

    const invalidRows = previewRows.filter((row) => !row.isValid).length;

    return {
      headers: parsed.headers,
      requiredHeaders: CSV_REQUIRED_HEADERS,
      totalRows: previewRows.length,
      validRows: previewRows.length - invalidRows,
      invalidRows,
      hasErrors: invalidRows > 0,
      rows: previewRows,
    };
  }

  private normalizeHeader(value: string) {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeTextField(value: string) {
    return value.trim().replace(/\s+/g, ' ');
  }

  private detectDelimiter(headerLine: string): ',' | ';' {
    const semicolonCount = (headerLine.match(/;/g) ?? []).length;
    const commaCount = (headerLine.match(/,/g) ?? []).length;

    return semicolonCount > commaCount ? ';' : ',';
  }

  private parseCsvLine(line: string, delimiter: ',' | ';') {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        fields.push(current);
        current = '';
        continue;
      }

      current += char;
    }

    fields.push(current);
    return fields;
  }

  private decodeCsvBuffer(buffer: Buffer) {
    const text = buffer.toString('utf-8');
    return text.replace(/^\uFEFF/, '');
  }

  private buildCredentialsWorkbook(
    rows: Array<{ fullName: string; email: string; password: string }>,
  ) {
    const worksheet = XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        [HEADER_FULL_NAME]: row.fullName,
        [HEADER_EMAIL]: row.email,
        [HEADER_PASSWORD]: row.password,
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);

    return XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
  }

  private buildWorkbookFileName() {
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '-',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');

    return `students-import-${stamp}.xlsx`;
  }

  private storeCredentialsFile(file: {
    ownerUserId: string;
    fileName: string;
    content: Buffer;
  }) {
    this.cleanupExpiredFiles();

    const downloadId = randomUUID();
    this.credentialsFiles.set(downloadId, {
      ...file,
      createdAt: Date.now(),
    });

    return downloadId;
  }

  private cleanupExpiredFiles() {
    const now = Date.now();

    for (const [key, file] of this.credentialsFiles.entries()) {
      if (now - file.createdAt > MAX_CREDENTIAL_FILE_AGE_MS) {
        this.credentialsFiles.delete(key);
      }
    }
  }

  private generatePassword(length = 10) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

    let result = '';
    for (let i = 0; i < length; i += 1) {
      const index = randomInt(0, alphabet.length);
      result += alphabet[index];
    }

    return result;
  }
}

