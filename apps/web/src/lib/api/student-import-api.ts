import { getApiBaseUrl } from './base-url';

type StudentImportRequestContext = {
  token: string;
  courseId?: string;
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
  requiredHeaders: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  hasErrors: boolean;
  rows: StudentImportPreviewRow[];
};

export type StudentImportResult = {
  summary: {
    totalRows: number;
    createdCount: number;
    skippedCount: number;
    failedCount: number;
    enrolledCount: number;
  };
  downloadId: string;
  downloadFileName: string;
};

export const studentImportApi = {
  previewByAdmin: (token: string, file: File) =>
    previewStudents('/users/admin/students/import/preview', { token }, file),

  importByAdmin: (token: string, file: File) =>
    importStudents('/users/admin/students/import', { token }, file),

  previewByCourse: (token: string, courseId: string, file: File) =>
    previewStudents(`/enrollments/course/${courseId}/students/import/preview`, { token, courseId }, file),

  importByCourse: (
    token: string,
    courseId: string,
    file: File,
    enrollToCourse: boolean,
  ) =>
    importStudents(
      `/enrollments/course/${courseId}/students/import`,
      { token, courseId },
      file,
      enrollToCourse,
    ),

  downloadResultFile: async (token: string, downloadId: string, fallbackFileName?: string) => {
    const response = await fetch(`${getApiBaseUrl()}/users/students/import/download/${downloadId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') ?? '';
    const fileName =
      parseFileNameFromDisposition(disposition) ?? fallbackFileName ?? 'students-import-result.xlsx';

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  },
};

async function previewStudents(path: string, context: StudentImportRequestContext, file: File) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.token}`,
    },
    body: buildFormData(file),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<StudentImportPreview>;
}

async function importStudents(
  path: string,
  context: StudentImportRequestContext,
  file: File,
  enrollToCourse?: boolean,
) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${context.token}`,
    },
    body: buildFormData(file, enrollToCourse),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return response.json() as Promise<StudentImportResult>;
}

function buildFormData(file: File, enrollToCourse?: boolean) {
  const formData = new FormData();
  formData.append('file', file);

  if (typeof enrollToCourse === 'boolean') {
    formData.append('enrollToCourse', String(enrollToCourse));
  }

  return formData;
}

async function extractErrorMessage(response: Response) {
  const fallback = `Request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };

    if (!payload?.message) return fallback;
    if (Array.isArray(payload.message)) return payload.message.join(', ');
    return payload.message;
  } catch {
    return fallback;
  }
}

function parseFileNameFromDisposition(disposition: string) {
  if (!disposition) return null;

  const fileNameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
  if (!fileNameMatch) return null;

  return fileNameMatch[1];
}

