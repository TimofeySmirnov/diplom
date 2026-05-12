'use client';

import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { studentImportApi, StudentImportPreview, StudentImportResult } from '@/lib/api';

type StudentImportModalProps = {
  open: boolean;
  accessToken: string | null;
  mode: 'admin' | 'course';
  courseId?: string;
  onClose: () => void;
  onImported?: () => Promise<void> | void;
};

type WizardStep = 'requirements' | 'preview' | 'importing' | 'success';

const STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 'requirements', label: 'Требования' },
  { id: 'preview', label: 'Проверка' },
  { id: 'importing', label: 'Импорт' },
  { id: 'success', label: 'Готово' },
];

export function StudentImportModal({
  open,
  accessToken,
  mode,
  courseId,
  onClose,
  onImported,
}: StudentImportModalProps) {
  const [step, setStep] = useState<WizardStep>('requirements');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentImportPreview | null>(null);
  const [result, setResult] = useState<StudentImportResult | null>(null);
  const [enrollToCourse, setEnrollToCourse] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const isCourseMode = mode === 'course' && Boolean(courseId);

  const canContinueImport = useMemo(() => {
    if (!preview) return false;
    return !preview.hasErrors && preview.validRows > 0;
  }, [preview]);

  useEffect(() => {
    if (!open) return;

    setStep('requirements');
    setFile(null);
    setPreview(null);
    setResult(null);
    setEnrollToCourse(false);
    setLoadingPreview(false);
    setImporting(false);
    setError(null);
    setDownloadNotice(null);
  }, [open]);

  if (!open) {
    return null;
  }

  const close = () => {
    if (importing) return;
    onClose();
  };

  const runPreview = async () => {
    if (!accessToken) {
      setError('Требуется авторизация.');
      return;
    }
    if (!file) {
      setError('Выберите CSV-файл для проверки.');
      return;
    }

    setLoadingPreview(true);
    setError(null);
    setDownloadNotice(null);

    try {
      const data = isCourseMode
        ? await studentImportApi.previewByCourse(accessToken, courseId!, file)
        : await studentImportApi.previewByAdmin(accessToken, file);

      setPreview(data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось проверить CSV-файл');
    } finally {
      setLoadingPreview(false);
    }
  };

  const runImport = async () => {
    if (!accessToken || !file) return;

    setImporting(true);
    setStep('importing');
    setError(null);
    setDownloadNotice(null);

    try {
      const importResult = isCourseMode
        ? await studentImportApi.importByCourse(accessToken, courseId!, file, enrollToCourse)
        : await studentImportApi.importByAdmin(accessToken, file);

      setResult(importResult);
      setStep('success');

      try {
        await studentImportApi.downloadResultFile(
          accessToken,
          importResult.downloadId,
          importResult.downloadFileName,
        );
        setDownloadNotice('Файл с логинами и паролями скачан.');
      } catch (downloadError) {
        setDownloadNotice(
          downloadError instanceof Error
            ? downloadError.message
            : 'Импорт завершён, но файл не удалось скачать автоматически.',
        );
      }

      await onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить импорт');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  const downloadAgain = async () => {
    if (!accessToken || !result) return;

    setError(null);
    setDownloadNotice(null);

    try {
      await studentImportApi.downloadResultFile(
        accessToken,
        result.downloadId,
        result.downloadFileName,
      );
      setDownloadNotice('Файл с логинами и паролями скачан.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось скачать файл.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-700">Импорт студентов из CSV</h2>
            <p className="mt-1 text-sm text-gray-500">
              Пошаговая загрузка студентов с проверкой и выдачей логинов и паролей.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6 py-4">
          <div className="grid gap-2 sm:grid-cols-4">
            {STEPS.map((item) => {
              const currentIndex = STEPS.findIndex((stepItem) => stepItem.id === step);
              const stepIndex = STEPS.findIndex((stepItem) => stepItem.id === item.id);
              const isActive = currentIndex === stepIndex;
              const isCompleted = currentIndex > stepIndex;

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50 text-gray-700'
                      : isCompleted
                        ? 'border-emerald-200 bg-emerald-100 text-gray-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  <span className="font-semibold">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {step === 'requirements' ? (
            <div className="grid gap-6">
              <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={20} className="text-emerald-500" />
                  <h3 className="text-lg font-semibold text-gray-700">Требования к CSV</h3>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  <li>Файл должен быть в кодировке UTF-8.</li>
                  <li>Обязательные колонки: ФИО, email, группа.</li>
                  <li>email должен быть уникальным в файле и в системе.</li>
                  <li>Пустые значения ФИО, email и группы не допускаются.</li>
                </ul>
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Пример формата
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-gray-700">
{`ФИО,email,группа
Иванов Иван Иванович,ivanov@example.com,ИС-21
Петрова Анна Сергеевна,petrova@example.com,П-31`}
                  </pre>
                </div>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Upload size={20} className="text-emerald-500" />
                  <h3 className="text-lg font-semibold text-gray-700">Файл для импорта</h3>
                </div>
                <div className="mt-3 grid gap-3">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      setFile(selected);
                      setPreview(null);
                      setError(null);
                    }}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-600"
                  />

                  {file ? (
                    <p className="text-sm text-gray-700">
                      Выбран файл: <span className="font-semibold">{file.name}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Файл пока не выбран.</p>
                  )}

                  {isCourseMode ? (
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={enrollToCourse}
                        onChange={(event) => setEnrollToCourse(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      Зачислить сразу на курс
                    </label>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}

          {step === 'preview' ? (
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewStat label="Всего строк" value={String(preview?.totalRows ?? 0)} />
                <PreviewStat label="Без ошибок" value={String(preview?.validRows ?? 0)} />
                <PreviewStat label="С ошибками" value={String(preview?.invalidRows ?? 0)} />
              </div>

              {preview?.hasErrors ? (
                <div className="rounded-xl border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-500">
                  Импорт невозможен: исправьте ошибки в CSV и повторите проверку.
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2 text-sm text-emerald-500">
                  Файл прошёл проверку. Можно запускать импорт.
                </div>
              )}

              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Строка</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">ФИО</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">email</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Группа</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-700">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {preview?.rows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-2 text-gray-700">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-gray-700">{row.fullName || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{row.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{row.group || '—'}</td>
                        <td className="px-3 py-2">
                          {row.isValid ? <Badge tone="success">Готово</Badge> : <Badge tone="warning">Ошибка</Badge>}
                          {!row.isValid && row.errors.length > 0 ? (
                            <p className="mt-1 text-xs text-red-500">{row.errors.join(' ')}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {step === 'importing' ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <p className="text-base font-semibold text-gray-700">Выполняется импорт студентов...</p>
              <p className="text-sm text-gray-500">
                Пожалуйста, не закрывайте окно до завершения операции.
              </p>
            </div>
          ) : null}

          {step === 'success' && result ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-100 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <p className="text-base font-semibold text-gray-700">Импорт успешно завершён</p>
                </div>
                <p className="mt-1 text-sm text-gray-700">
                  Создано студентов: {result.summary.createdCount}
                  {isCourseMode ? `, зачислено на курс: ${result.summary.enrolledCount}` : ''}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <PreviewStat label="Создано" value={String(result.summary.createdCount)} />
                <PreviewStat label="Пропущено" value={String(result.summary.skippedCount)} />
                <PreviewStat label="Ошибки" value={String(result.summary.failedCount)} />
                <PreviewStat label="Зачислено" value={String(result.summary.enrolledCount)} />
              </div>

              {downloadNotice ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {downloadNotice}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-100 px-3 py-2 text-sm text-red-500">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          {step === 'requirements' ? (
            <>
              <Button variant="secondary" onClick={close} disabled={loadingPreview}>
                Отмена
              </Button>
              <Button onClick={() => void runPreview()} disabled={loadingPreview || !file}>
                {loadingPreview ? 'Проверка...' : 'Проверить файл'}
              </Button>
            </>
          ) : null}

          {step === 'preview' ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setStep('requirements');
                  setError(null);
                }}
                disabled={importing}
              >
                Назад
              </Button>
              <Button onClick={() => void runImport()} disabled={!canContinueImport || importing}>
                {importing ? 'Импорт...' : 'Продолжить импорт'}
              </Button>
            </>
          ) : null}

          {step === 'importing' ? (
            <Button variant="secondary" disabled>
              Импорт выполняется...
            </Button>
          ) : null}

          {step === 'success' ? (
            <>
              <Button variant="secondary" onClick={() => void downloadAgain()}>
                Скачать файл ещё раз
              </Button>
              <Button onClick={close}>Закрыть</Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-700">{value}</p>
    </div>
  );
}

