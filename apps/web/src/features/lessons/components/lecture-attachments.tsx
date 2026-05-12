'use client';

import {
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Trash2,
  Upload,
} from 'lucide-react';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { resolveStaticFileUrl } from '@/lib/api';

const MAX_ATTACHMENTS = 6;

const ALLOWED_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.pdf',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

type LectureAttachmentsProps = {
  attachments: string[];
  canManage?: boolean;
  uploading?: boolean;
  deletingFileUrl?: string | null;
  onUpload?: (files: File[]) => Promise<void> | void;
  onDelete?: (fileUrl: string) => Promise<void> | void;
};

export function LectureAttachments({
  attachments,
  canManage = false,
  uploading = false,
  deletingFileUrl = null,
  onUpload,
  onDelete,
}: LectureAttachmentsProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const availableSlots = useMemo(
    () => Math.max(0, MAX_ATTACHMENTS - attachments.length),
    [attachments.length],
  );
  const isUploadDisabled = uploading || availableSlots === 0;

  const handleSelectFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!onUpload) return;

    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (selected.length === 0) return;

    if (selected.length > availableSlots) {
      setLocalError(`Можно добавить не более ${availableSlots} файлов.`);
      return;
    }

    const invalid = selected.find((file) => {
      const extension = getFileExtension(file.name);
      return !ALLOWED_EXTENSIONS.has(extension);
    });

    if (invalid) {
      setLocalError(`Недопустимый формат файла: ${invalid.name}`);
      return;
    }

    setLocalError(null);

    try {
      await onUpload(selected);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Не удалось загрузить файлы.');
    }
  };

  const openFilePicker = () => {
    if (isUploadDisabled) return;
    fileInputRef.current?.click();
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-gray-700">Материалы лекции</h3>
        <span className="text-xs text-gray-500">
          {attachments.length} / {MAX_ATTACHMENTS}
        </span>
      </div>

      {canManage ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            name="files"
            multiple
            accept=".doc,.docx,.pdf,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(event) => void handleSelectFiles(event)}
            disabled={isUploadDisabled}
          />

          <Button
            type="button"
            variant="secondary"
            onClick={openFilePicker}
            disabled={isUploadDisabled}
          >
            <Upload size={18} className="mr-1 text-gray-500" />
            {uploading ? 'Загрузка...' : 'Добавить файлы'}
          </Button>

          <span className="text-xs text-gray-500">
            До 20 МБ на файл. Поддерживаются doc/docx, pdf, ppt/pptx, xls/xlsx, jpg/png/webp.
          </span>
        </div>
      ) : null}

      {localError ? <p className="mt-3 text-sm text-red-500">{localError}</p> : null}

      {attachments.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">Файлы пока не добавлены.</p>
      ) : (
        <div className="mt-4 grid gap-2">
          {attachments.map((fileUrl) => {
            const fileName = extractFileName(fileUrl);
            const extension = getFileExtension(fileName);
            const Icon = getFileIcon(extension);

            return (
              <div
                key={fileUrl}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Icon size={18} className="text-gray-500" />
                  <span className="truncate text-sm text-gray-700">{fileName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a href={resolveStaticFileUrl(fileUrl)} target="_blank" rel="noreferrer">
                    <Button type="button" size="sm" variant="secondary">
                      <Download size={18} className="mr-1 text-gray-500" />
                      Скачать
                    </Button>
                  </a>
                  {canManage && onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void onDelete(fileUrl)}
                      disabled={deletingFileUrl === fileUrl}
                    >
                      <Trash2 size={18} className="mr-1 text-gray-500" />
                      {deletingFileUrl === fileUrl ? 'Удаление...' : 'Удалить'}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function extractFileName(fileUrl: string) {
  const cleaned = fileUrl.split('?')[0].split('#')[0];
  const parts = cleaned.split('/');
  return decodeURIComponent(parts[parts.length - 1] || fileUrl);
}

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return fileName.slice(dotIndex).toLowerCase();
}

function getFileIcon(extension: string) {
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return FileImage;
  }
  if (['.xls', '.xlsx'].includes(extension)) {
    return FileSpreadsheet;
  }
  if (['.doc', '.docx', '.pdf', '.ppt', '.pptx'].includes(extension)) {
    return FileText;
  }
  return File;
}
