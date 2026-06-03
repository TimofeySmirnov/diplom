from __future__ import annotations

import json
import os
import queue
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import webbrowser
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, unquote, urlparse

import tkinter as tk
from tkinter import messagebox, ttk


APP_NAME = "ZSkills - Панель управления"
BACKEND_KEY = "backend"
FRONTEND_KEY = "frontend"
DEFAULT_API_PORT = 4000
DEFAULT_WEB_PORT = 3000
DEFAULT_DB_PORT = 5432
DB_ENV_KEYS = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
SENSITIVE_KEY_PATTERN = re.compile(r"(PASSWORD|SECRET|TOKEN|DATABASE_URL)", re.IGNORECASE)
POSTGRES_URL_PATTERN = re.compile(r"(postgres(?:ql)?://[^:\s]+:)([^@\s]+)(@)", re.IGNORECASE)


@dataclass
class CommandResult:
  code: int
  output: str


@dataclass
class ServiceProcess:
  key: str
  process: subprocess.Popen[str]


class LauncherApp(tk.Tk):
  def __init__(self) -> None:
    super().__init__()

    self.project_root = find_project_root()
    self.api_dir = self.project_root / "apps" / "api"
    self.web_dir = self.project_root / "apps" / "web"
    self.env_path = self.api_dir / ".env"
    self.log_path = self.project_root / "launcher.log"
    self.state_dir = self.project_root / ".launcher"
    self.state_path = self.state_dir / "state.json"

    self.log_queue: queue.Queue[str] = queue.Queue()
    self.log_lock = threading.Lock()
    self.operation_lock = threading.Lock()
    self.services: dict[str, ServiceProcess] = {}
    self.known_pids = self.load_state()
    self.secret_values: set[str] = set()
    self.package_manager = find_package_manager()
    self.local_ip = detect_lan_ip()

    self.title(APP_NAME)
    self.geometry("980x680")
    self.minsize(860, 600)
    self.protocol("WM_DELETE_WINDOW", self.on_close)

    self.backend_status = tk.StringVar(value="остановлен")
    self.frontend_status = tk.StringVar(value="остановлен")
    self.local_site_url = tk.StringVar(value="")
    self.lan_site_url = tk.StringVar(value="")
    self.launch_status = tk.StringVar(value="Готово")
    self.settings_status = tk.StringVar(value="")
    self.admin_status = tk.StringVar(value="")
    self.pm_status = tk.StringVar(value=self.package_manager.name if self.package_manager else "не найден")

    self.db_host = tk.StringVar()
    self.db_port = tk.StringVar()
    self.db_name = tk.StringVar()
    self.db_user = tk.StringVar()
    self.db_password = tk.StringVar()
    self.admin_name = tk.StringVar()
    self.admin_email = tk.StringVar()
    self.admin_password = tk.StringVar()

    self.build_ui()
    self.load_settings_to_form()
    self.refresh_addresses()
    self.refresh_statuses()
    self.after(100, self.flush_log_queue)
    self.after(1000, self.periodic_refresh)

    self.log("Лаунчер запущен.")
    self.log(f"Корень проекта: {self.project_root}")
    if self.package_manager:
      self.log(f"Команды Node будут запускаться через {self.package_manager.name}.")
    else:
      self.log("Не найден npm или pnpm. Установите Node.js и зависимости проекта.")

  def build_ui(self) -> None:
    self.columnconfigure(0, weight=1)
    self.rowconfigure(0, weight=1)

    notebook = ttk.Notebook(self)
    notebook.grid(row=0, column=0, sticky="nsew")

    launch_frame = ttk.Frame(notebook, padding=16)
    settings_frame = ttk.Frame(notebook, padding=16)
    admins_frame = ttk.Frame(notebook, padding=16)
    logs_frame = ttk.Frame(notebook, padding=16)

    notebook.add(launch_frame, text="Запуск")
    notebook.add(settings_frame, text="Настройки")
    notebook.add(admins_frame, text="Администраторы")
    notebook.add(logs_frame, text="Логи")

    self.build_launch_tab(launch_frame)
    self.build_settings_tab(settings_frame)
    self.build_admins_tab(admins_frame)
    self.build_logs_tab(logs_frame)

  def build_launch_tab(self, frame: ttk.Frame) -> None:
    frame.columnconfigure(0, weight=1)
    frame.columnconfigure(1, weight=1)

    controls = ttk.Frame(frame)
    controls.grid(row=0, column=0, columnspan=2, sticky="ew")
    controls.columnconfigure(0, weight=1)
    controls.columnconfigure(1, weight=1)

    self.start_button = ttk.Button(controls, text="Запустить проект", command=self.start_project)
    self.start_button.grid(row=0, column=0, sticky="ew", padx=(0, 8))

    self.stop_button = ttk.Button(controls, text="Остановить проект", command=self.stop_project)
    self.stop_button.grid(row=0, column=1, sticky="ew", padx=(8, 0))

    status_box = ttk.LabelFrame(frame, text="Статус", padding=12)
    status_box.grid(row=1, column=0, columnspan=2, sticky="ew", pady=(16, 0))
    status_box.columnconfigure(1, weight=1)

    add_label_row(status_box, 0, "Backend", self.backend_status)
    add_label_row(status_box, 1, "Frontend", self.frontend_status)
    add_label_row(status_box, 2, "Пакетный менеджер", self.pm_status)
    add_label_row(status_box, 3, "Состояние", self.launch_status)

    address_box = ttk.LabelFrame(frame, text="Адреса сайта", padding=12)
    address_box.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(16, 0))
    address_box.columnconfigure(1, weight=1)

    add_copyable_row(address_box, 0, "Локально", self.local_site_url)
    add_copyable_row(address_box, 1, "В локальной сети", self.lan_site_url)

    browser_button = ttk.Button(
      address_box,
      text="Открыть сайт в браузере",
      command=self.open_site,
    )
    browser_button.grid(row=2, column=0, columnspan=2, sticky="ew", pady=(12, 0))

    info = ttk.Label(
      frame,
      text=(
        "При запуске лаунчер проверяет БД, выполняет миграции, запускает seed "
        "дефолтного администратора, затем стартует backend и frontend в production-режиме."
      ),
      wraplength=860,
      justify="left",
    )
    info.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(18, 0))

  def build_settings_tab(self, frame: ttk.Frame) -> None:
    frame.columnconfigure(1, weight=1)

    rows = [
      ("DB_HOST", self.db_host, False),
      ("DB_PORT", self.db_port, False),
      ("DB_NAME", self.db_name, False),
      ("DB_USER", self.db_user, False),
      ("DB_PASSWORD", self.db_password, True),
    ]

    for row, (label, variable, secret) in enumerate(rows):
      ttk.Label(frame, text=label).grid(row=row, column=0, sticky="w", pady=5, padx=(0, 10))
      entry = ttk.Entry(frame, textvariable=variable, show="*" if secret else "")
      entry.grid(row=row, column=1, sticky="ew", pady=5)

    button_bar = ttk.Frame(frame)
    button_bar.grid(row=len(rows), column=0, columnspan=2, sticky="ew", pady=(16, 0))
    button_bar.columnconfigure(0, weight=1)
    button_bar.columnconfigure(1, weight=1)

    ttk.Button(button_bar, text="Загрузить из .env", command=self.load_settings_to_form).grid(
      row=0,
      column=0,
      sticky="ew",
      padx=(0, 8),
    )
    ttk.Button(button_bar, text="Сохранить настройки", command=self.save_db_settings).grid(
      row=0,
      column=1,
      sticky="ew",
      padx=(8, 0),
    )

    status = ttk.Label(frame, textvariable=self.settings_status, wraplength=860)
    status.grid(row=len(rows) + 1, column=0, columnspan=2, sticky="ew", pady=(14, 0))

    note = ttk.Label(
      frame,
      text=(
        "Лаунчер обновляет только DATABASE_URL и DB_* переменные в apps/api/.env. "
        "Перед каждой записью создается backup рядом с .env."
      ),
      wraplength=860,
      justify="left",
    )
    note.grid(row=len(rows) + 2, column=0, columnspan=2, sticky="ew", pady=(18, 0))

  def build_admins_tab(self, frame: ttk.Frame) -> None:
    frame.columnconfigure(1, weight=1)

    fields = [
      ("ФИО/имя", self.admin_name, False),
      ("Email/login", self.admin_email, False),
      ("Password", self.admin_password, True),
    ]

    for row, (label, variable, secret) in enumerate(fields):
      ttk.Label(frame, text=label).grid(row=row, column=0, sticky="w", pady=5, padx=(0, 10))
      entry = ttk.Entry(frame, textvariable=variable, show="*" if secret else "")
      entry.grid(row=row, column=1, sticky="ew", pady=5)

    button_bar = ttk.Frame(frame)
    button_bar.grid(row=len(fields), column=0, columnspan=2, sticky="ew", pady=(16, 0))
    button_bar.columnconfigure(0, weight=1)
    button_bar.columnconfigure(1, weight=1)

    ttk.Button(button_bar, text="Добавить администратора", command=self.create_admin).grid(
      row=0,
      column=0,
      sticky="ew",
      padx=(0, 8),
    )
    ttk.Button(button_bar, text="Запустить seed администратора", command=self.seed_default_admin).grid(
      row=0,
      column=1,
      sticky="ew",
      padx=(8, 0),
    )

    status = ttk.Label(frame, textvariable=self.admin_status, wraplength=860)
    status.grid(row=len(fields) + 1, column=0, columnspan=2, sticky="ew", pady=(14, 0))

    note = ttk.Label(
      frame,
      text=(
        "Пароль передается служебному Prisma-скрипту через переменную окружения процесса "
        "и не записывается в логи."
      ),
      wraplength=860,
      justify="left",
    )
    note.grid(row=len(fields) + 2, column=0, columnspan=2, sticky="ew", pady=(18, 0))

  def build_logs_tab(self, frame: ttk.Frame) -> None:
    frame.columnconfigure(0, weight=1)
    frame.rowconfigure(0, weight=1)

    text_frame = ttk.Frame(frame)
    text_frame.grid(row=0, column=0, sticky="nsew")
    text_frame.columnconfigure(0, weight=1)
    text_frame.rowconfigure(0, weight=1)

    self.logs_text = tk.Text(text_frame, wrap="word", state="disabled", height=20)
    self.logs_text.grid(row=0, column=0, sticky="nsew")

    scrollbar = ttk.Scrollbar(text_frame, orient="vertical", command=self.logs_text.yview)
    scrollbar.grid(row=0, column=1, sticky="ns")
    self.logs_text.configure(yscrollcommand=scrollbar.set)

    button_bar = ttk.Frame(frame)
    button_bar.grid(row=1, column=0, sticky="ew", pady=(12, 0))
    button_bar.columnconfigure(0, weight=1)
    button_bar.columnconfigure(1, weight=1)

    ttk.Button(button_bar, text="Очистить окно логов", command=self.clear_log_window).grid(
      row=0,
      column=0,
      sticky="ew",
      padx=(0, 8),
    )
    ttk.Button(button_bar, text="Открыть файл launcher.log", command=self.open_log_file).grid(
      row=0,
      column=1,
      sticky="ew",
      padx=(8, 0),
    )

  def start_project(self) -> None:
    self.run_background(self._start_project)

  def _start_project(self) -> None:
    if not self.operation_lock.acquire(blocking=False):
      self.set_launch_status("Операция уже выполняется.")
      return

    try:
      self.set_buttons_state("disabled")
      self.set_launch_status("Запуск проекта...")
      self.log("Запуск проекта начат.")
      self.refresh_addresses()

      if self.is_started_by_launcher(BACKEND_KEY) or self.is_started_by_launcher(FRONTEND_KEY):
        self.set_launch_status("Проект уже запущен лаунчером. Дубликаты не создаются.")
        self.log("Найден уже запущенный проект, повторный запуск пропущен.")
        return

      if not self.package_manager:
        raise RuntimeError("Не найден npm или pnpm. Установите Node.js и зависимости проекта.")

      api_port = self.get_api_port()
      web_port = self.get_web_port()

      if is_port_open("127.0.0.1", api_port):
        raise RuntimeError(
          f"Порт backend {api_port} уже занят. Остановите процесс на этом порту и повторите запуск.",
        )

      if self.web_dir.exists() and is_port_open("127.0.0.1", web_port):
        raise RuntimeError(
          f"Порт frontend {web_port} уже занят. Остановите процесс на этом порту и повторите запуск.",
        )

      self.require_project_files()
      self.check_database()
      self.run_migrations()
      self.run_admin_seed()
      self.ensure_production_builds()
      self.start_backend_process()

      if not wait_for_port(api_port, timeout_seconds=35):
        raise RuntimeError("Backend запущен, но порт API не открылся. Проверьте логи backend.")

      if self.web_dir.exists():
        self.start_frontend_process()
        if not wait_for_port(web_port, timeout_seconds=45):
          raise RuntimeError("Frontend запущен, но порт сайта не открылся. Проверьте логи frontend.")

      self.refresh_addresses()
      self.set_launch_status("Проект запущен.")
      self.log("Проект успешно запущен.")
    except Exception as error:
      self.set_launch_status(f"Ошибка запуска: {error}")
      self.log(f"Ошибка запуска: {error}")
      self.stop_services_unlocked()
    finally:
      self.set_buttons_state("normal")
      self.operation_lock.release()
      self.refresh_statuses()

  def stop_project(self) -> None:
    self.run_background(self._stop_project)

  def _stop_project(self) -> None:
    if not self.operation_lock.acquire(blocking=False):
      self.set_launch_status("Операция уже выполняется.")
      return

    try:
      self.set_buttons_state("disabled")
      self.set_launch_status("Остановка проекта...")
      self.log("Остановка проекта начата.")

      self.stop_services_unlocked()
      self.set_launch_status("Проект остановлен.")
      self.log("Проект остановлен.")
    finally:
      self.set_buttons_state("normal")
      self.operation_lock.release()
      self.refresh_statuses()

  def check_database(self) -> None:
    self.set_launch_status("Проверка подключения к БД...")
    result = self.run_command(
      "Проверка БД",
      self.pm_args("db:check"),
      self.api_dir,
      stdin_text="SELECT 1;",
    )

    if result.code != 0:
      raise RuntimeError(
        "База данных недоступна. Проверьте DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD и запущен ли PostgreSQL.",
      )

  def run_migrations(self) -> None:
    self.set_launch_status("Запуск миграций...")
    result = self.run_command("Миграции Prisma", self.pm_args("migrate:deploy"), self.api_dir)
    if result.code != 0:
      raise RuntimeError("Миграции не выполнены. Проверьте доступ к БД и журнал миграций.")

  def run_admin_seed(self) -> None:
    self.set_launch_status("Seed дефолтного администратора...")
    result = self.run_command("Seed администратора", self.pm_args("seed:admin"), self.api_dir)
    if result.code != 0:
      raise RuntimeError(
        "Seed администратора не выполнен. Проверьте ADMIN_EMAIL и ADMIN_PASSWORD в apps/api/.env.",
      )

  def ensure_production_builds(self) -> None:
    api_entry = self.api_dir / "dist" / "main.js"
    if not api_entry.exists():
      self.set_launch_status("Сборка backend...")
      result = self.run_command("Сборка backend", self.pm_args("build"), self.api_dir)
      if result.code != 0:
        raise RuntimeError("Backend не собран. Проверьте логи сборки.")

    web_build_ready = (self.web_dir / ".next" / "server").exists() and (
      self.web_dir / ".next" / "static"
    ).exists()
    if self.web_dir.exists() and (not web_build_ready or not self.web_build_env_matches()):
      self.set_launch_status("Сборка frontend...")
      result = self.run_command(
        "Сборка frontend",
        self.pm_args("build"),
        self.web_dir,
        env_updates=self.build_runtime_env(),
      )
      if result.code != 0:
        raise RuntimeError("Frontend не собран. Проверьте логи сборки.")
      self.write_web_build_marker()

  def start_backend_process(self) -> None:
    self.set_launch_status("Запуск backend...")
    process = self.start_service(
      BACKEND_KEY,
      "Backend",
      self.pm_args("start"),
      self.api_dir,
      env_updates=self.build_runtime_env(),
    )
    self.known_pids[BACKEND_KEY] = process.pid
    self.save_state()

  def start_frontend_process(self) -> None:
    self.set_launch_status("Запуск frontend...")
    process = self.start_service(
      FRONTEND_KEY,
      "Frontend",
      self.pm_args("start"),
      self.web_dir,
      env_updates=self.build_runtime_env(),
    )
    self.known_pids[FRONTEND_KEY] = process.pid
    self.save_state()

  def create_admin(self) -> None:
    self.run_background(self._create_admin)

  def _create_admin(self) -> None:
    if not self.operation_lock.acquire(blocking=False):
      self.set_var(self.admin_status, "Операция уже выполняется.")
      return

    password = self.admin_password.get()
    try:
      if not self.package_manager:
        raise RuntimeError("Не найден npm или pnpm.")

      name = self.admin_name.get().strip()
      email = self.admin_email.get().strip().lower()

      if len(name) < 2:
        raise RuntimeError("Укажите имя администратора.")
      if "@" not in email:
        raise RuntimeError("Укажите корректный email/login.")
      if len(password) < 6:
        raise RuntimeError("Пароль должен быть не короче 6 символов.")

      self.set_var(self.admin_status, "Проверка БД...")
      self.check_database()

      self.set_var(self.admin_status, "Создание администратора...")
      result = self.run_command(
        "Создание администратора",
        self.pm_args("admin:create"),
        self.api_dir,
        env_updates={
          "LAUNCHER_ADMIN_NAME": name,
          "LAUNCHER_ADMIN_EMAIL": email,
          "LAUNCHER_ADMIN_PASSWORD": password,
        },
        extra_secrets=[password],
      )

      if result.code == 0 and "ADMIN_EXISTS" in result.output:
        self.set_var(self.admin_status, "Администратор с таким email уже существует. Дубль не создан.")
      elif result.code == 0:
        self.set_var(self.admin_status, "Администратор создан.")
        self.set_var(self.admin_password, "")
      elif result.code == 2:
        self.set_var(self.admin_status, "Пользователь с таким email уже существует, но он не администратор.")
      else:
        raise RuntimeError("Администратор не создан. Проверьте логи.")
    except Exception as error:
      self.set_var(self.admin_status, f"Ошибка: {error}")
      self.log(f"Ошибка создания администратора: {error}", extra_secrets=[password])
    finally:
      self.operation_lock.release()

  def seed_default_admin(self) -> None:
    self.run_background(self._seed_default_admin)

  def _seed_default_admin(self) -> None:
    if not self.operation_lock.acquire(blocking=False):
      self.set_var(self.admin_status, "Операция уже выполняется.")
      return

    try:
      if not self.package_manager:
        raise RuntimeError("Не найден npm или pnpm.")

      self.set_var(self.admin_status, "Проверка БД...")
      self.check_database()
      self.set_var(self.admin_status, "Seed администратора...")
      result = self.run_command("Seed администратора", self.pm_args("seed:admin"), self.api_dir)

      if result.code != 0:
        raise RuntimeError("Seed администратора не выполнен. Проверьте ADMIN_EMAIL и ADMIN_PASSWORD в .env.")

      self.set_var(self.admin_status, "Seed администратора выполнен.")
    except Exception as error:
      self.set_var(self.admin_status, f"Ошибка: {error}")
      self.log(f"Ошибка seed администратора: {error}")
    finally:
      self.operation_lock.release()

  def save_db_settings(self) -> None:
    try:
      host = self.db_host.get().strip()
      port = self.db_port.get().strip()
      name = self.db_name.get().strip()
      user = self.db_user.get().strip()
      password = self.db_password.get()

      if not host:
        raise RuntimeError("DB_HOST не может быть пустым.")
      if not port.isdigit():
        raise RuntimeError("DB_PORT должен быть числом.")
      if not name:
        raise RuntimeError("DB_NAME не может быть пустым.")
      if not user:
        raise RuntimeError("DB_USER не может быть пустым.")

      existing_env = read_env_file(self.env_path)
      query = "schema=public"
      if existing_env.get("DATABASE_URL"):
        parsed = urlparse(existing_env["DATABASE_URL"])
        query = parsed.query or query

      database_url = build_postgres_url(host, port, name, user, password, query)

      self.env_path.parent.mkdir(parents=True, exist_ok=True)
      backup_path = None
      if self.env_path.exists():
        backup_path = self.env_path.with_name(
          f".env.backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        )
        shutil.copy2(self.env_path, backup_path)

      update_env_file(
        self.env_path,
        {
          "DATABASE_URL": database_url,
          "DB_HOST": host,
          "DB_PORT": port,
          "DB_NAME": name,
          "DB_USER": user,
          "DB_PASSWORD": password,
        },
      )

      self.update_secret_values()
      self.settings_status.set(
        "Настройки БД сохранены."
        + (f" Backup: {backup_path.name}" if backup_path else " .env создан заново."),
      )
      self.log(
        "Настройки БД сохранены. DATABASE_URL и DB_* обновлены, секреты не выводятся.",
        extra_secrets=[password],
      )
    except Exception as error:
      self.settings_status.set(f"Ошибка сохранения: {error}")
      self.log(f"Ошибка сохранения настроек БД: {error}")

  def load_settings_to_form(self) -> None:
    env = read_env_file(self.env_path)
    settings = read_db_settings(env)

    self.db_host.set(settings.get("DB_HOST", "localhost"))
    self.db_port.set(settings.get("DB_PORT", str(DEFAULT_DB_PORT)))
    self.db_name.set(settings.get("DB_NAME", "diplom"))
    self.db_user.set(settings.get("DB_USER", "postgres"))
    self.db_password.set(settings.get("DB_PASSWORD", ""))
    self.update_secret_values()
    self.settings_status.set("Настройки загружены из apps/api/.env.")

  def run_command(
    self,
    title: str,
    args: list[str],
    cwd: Path,
    env_updates: dict[str, str] | None = None,
    stdin_text: str | None = None,
    extra_secrets: Iterable[str] | None = None,
  ) -> CommandResult:
    env = self.build_process_env(env_updates)
    command_text = " ".join(args)
    self.log(f"Запуск команды: {title}: {command_text}", extra_secrets=extra_secrets)

    try:
      process = subprocess.Popen(
        args,
        cwd=str(cwd),
        env=env,
        stdin=subprocess.PIPE if stdin_text is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        creationflags=windows_creation_flags(),
      )
    except FileNotFoundError as error:
      message = f"Команда не найдена: {args[0]}"
      self.log(message)
      return CommandResult(code=1, output=str(error))

    if stdin_text is not None and process.stdin:
      process.stdin.write(stdin_text)
      process.stdin.close()

    collected: list[str] = []
    assert process.stdout is not None
    for line in process.stdout:
      collected.append(line)
      self.log(line.rstrip(), source=title, extra_secrets=extra_secrets)

    code = process.wait()
    self.log(f"Команда завершена: {title}, код {code}.", extra_secrets=extra_secrets)
    return CommandResult(code=code, output="".join(collected))

  def start_service(
    self,
    key: str,
    title: str,
    args: list[str],
    cwd: Path,
    env_updates: dict[str, str] | None = None,
  ) -> subprocess.Popen[str]:
    env = self.build_process_env(env_updates)
    self.log(f"Запуск процесса: {title}: {' '.join(args)}")

    process = subprocess.Popen(
      args,
      cwd=str(cwd),
      env=env,
      stdin=subprocess.DEVNULL,
      stdout=subprocess.PIPE,
      stderr=subprocess.STDOUT,
      text=True,
      encoding="utf-8",
      errors="replace",
      bufsize=1,
      creationflags=windows_creation_flags(),
    )

    self.services[key] = ServiceProcess(key=key, process=process)

    threading.Thread(
      target=self.read_process_output,
      args=(key, title, process),
      daemon=True,
    ).start()

    return process

  def read_process_output(
    self,
    key: str,
    title: str,
    process: subprocess.Popen[str],
  ) -> None:
    assert process.stdout is not None
    for line in process.stdout:
      self.log(line.rstrip(), source=title)

    code = process.wait()
    self.log(f"Процесс {title} завершился с кодом {code}.")

    current = self.services.get(key)
    if current and current.process.pid == process.pid:
      self.services.pop(key, None)
      self.known_pids.pop(key, None)
      self.save_state()
      self.refresh_statuses()

  def stop_service(self, key: str) -> None:
    service = self.services.pop(key, None)
    pid = service.process.pid if service else self.known_pids.get(key)

    if not pid:
      return

    if not is_pid_alive(pid):
      self.known_pids.pop(key, None)
      self.save_state()
      return

    title = "frontend" if key == FRONTEND_KEY else "backend"
    self.log(f"Остановка {title}, PID {pid}.")

    terminate_process_tree(pid)

    if service and service.process.poll() is None:
      try:
        service.process.wait(timeout=8)
      except Exception:
        pass

    if is_pid_alive(pid):
      terminate_process_tree(pid, force=True)

    self.known_pids.pop(key, None)
    self.save_state()

  def stop_services_unlocked(self) -> None:
    for key in [FRONTEND_KEY, BACKEND_KEY]:
      self.stop_service(key)

    self.known_pids = {}
    self.save_state()

  def pm_args(self, script: str) -> list[str]:
    if not self.package_manager:
      return ["npm", "run", script]
    return [str(self.package_manager), "run", script]

  def build_runtime_env(self) -> dict[str, str]:
    api_port = str(self.get_api_port())
    web_port = str(self.get_web_port())
    local_ip = self.local_ip or "127.0.0.1"
    env = read_env_file(self.env_path)

    origins = [
      "http://localhost:" + web_port,
      "http://127.0.0.1:" + web_port,
      "http://" + local_ip + ":" + web_port,
    ]
    existing_origins = [
      item.strip()
      for item in env.get("CORS_ORIGIN", "").split(",")
      if item.strip()
    ]
    cors_origin = ",".join(dedupe(existing_origins + origins))

    return {
      "NODE_ENV": "production",
      "PORT": api_port,
      "HOST": "0.0.0.0",
      "CORS_ORIGIN": cors_origin,
      "NEXT_PUBLIC_API_PORT": api_port,
      "NEXT_PUBLIC_API_URL": env.get("NEXT_PUBLIC_API_URL", f"http://localhost:{api_port}/api"),
    }

  def desired_web_build_env(self) -> dict[str, str]:
    runtime_env = self.build_runtime_env()
    return {
      "NEXT_PUBLIC_API_PORT": runtime_env["NEXT_PUBLIC_API_PORT"],
      "NEXT_PUBLIC_API_URL": runtime_env["NEXT_PUBLIC_API_URL"],
    }

  def web_build_marker_path(self) -> Path:
    return self.web_dir / ".next" / "launcher-env.json"

  def web_build_env_matches(self) -> bool:
    desired = self.desired_web_build_env()
    marker_path = self.web_build_marker_path()

    if not marker_path.exists():
      return desired == {
        "NEXT_PUBLIC_API_PORT": str(DEFAULT_API_PORT),
        "NEXT_PUBLIC_API_URL": f"http://localhost:{DEFAULT_API_PORT}/api",
      }

    try:
      current = json.loads(marker_path.read_text(encoding="utf-8"))
      return current == desired
    except Exception:
      return False

  def write_web_build_marker(self) -> None:
    marker_path = self.web_build_marker_path()
    marker_path.parent.mkdir(parents=True, exist_ok=True)
    marker_path.write_text(
      json.dumps(self.desired_web_build_env(), ensure_ascii=False, indent=2),
      encoding="utf-8",
    )

  def build_process_env(self, updates: dict[str, str] | None = None) -> dict[str, str]:
    env = os.environ.copy()
    env.update(read_env_file(self.env_path))
    env.update(self.build_runtime_env())
    if updates:
      env.update(updates)
    return env

  def get_api_port(self) -> int:
    env = read_env_file(self.env_path)
    return parse_port(env.get("PORT"), DEFAULT_API_PORT)

  def get_web_port(self) -> int:
    env = read_env_file(self.env_path)
    return parse_port(env.get("WEB_PORT"), DEFAULT_WEB_PORT)

  def require_project_files(self) -> None:
    if not self.api_dir.exists():
      raise RuntimeError("Не найдена папка apps/api рядом с лаунчером.")

    if not (self.api_dir / "package.json").exists():
      raise RuntimeError("Не найден apps/api/package.json.")

    if self.web_dir.exists() and not (self.web_dir / "package.json").exists():
      raise RuntimeError("Не найден apps/web/package.json.")

    if not (self.api_dir / "node_modules").exists():
      raise RuntimeError("Не найдены зависимости backend: apps/api/node_modules.")

    if self.web_dir.exists() and not (self.web_dir / "node_modules").exists():
      raise RuntimeError("Не найдены зависимости frontend: apps/web/node_modules.")

  def refresh_addresses(self) -> None:
    web_port = self.get_web_port()
    self.set_var(self.local_site_url, f"http://localhost:{web_port}")
    if self.local_ip:
      self.set_var(self.lan_site_url, f"http://{self.local_ip}:{web_port}")
    else:
      self.set_var(self.lan_site_url, "IPv4-адрес локальной сети не найден")

  def refresh_statuses(self) -> None:
    api_port = self.get_api_port()
    web_port = self.get_web_port()
    self.set_var(
      self.backend_status,
      status_text(BACKEND_KEY, api_port, self.services, self.known_pids),
    )
    if self.web_dir.exists():
      self.set_var(
        self.frontend_status,
        status_text(FRONTEND_KEY, web_port, self.services, self.known_pids),
      )
    else:
      self.set_var(self.frontend_status, "не используется")

  def periodic_refresh(self) -> None:
    self.refresh_statuses()
    self.after(1000, self.periodic_refresh)

  def is_started_by_launcher(self, key: str) -> bool:
    service = self.services.get(key)
    if service and service.process.poll() is None:
      return True

    pid = self.known_pids.get(key)
    return bool(pid and is_pid_alive(pid))

  def open_site(self) -> None:
    url = self.local_site_url.get()
    if not url:
      messagebox.showerror(APP_NAME, "Адрес сайта пока не определен.")
      return
    webbrowser.open(url)

  def open_log_file(self) -> None:
    self.log_path.touch(exist_ok=True)
    if sys.platform.startswith("win"):
      os.startfile(self.log_path)  # type: ignore[attr-defined]
    else:
      webbrowser.open(self.log_path.as_uri())

  def clear_log_window(self) -> None:
    self.logs_text.configure(state="normal")
    self.logs_text.delete("1.0", "end")
    self.logs_text.configure(state="disabled")

  def log(
    self,
    message: str,
    source: str = "launcher",
    extra_secrets: Iterable[str] | None = None,
  ) -> None:
    text = self.redact(message, extra_secrets)
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [{source}] {text}\n"

    with self.log_lock:
      self.log_path.parent.mkdir(parents=True, exist_ok=True)
      with self.log_path.open("a", encoding="utf-8") as log_file:
        log_file.write(line)

    self.log_queue.put(line)

  def redact(self, message: str, extra_secrets: Iterable[str] | None = None) -> str:
    redacted = POSTGRES_URL_PATTERN.sub(r"\1[secret]\3", message)
    all_secrets = set(self.secret_values)
    if extra_secrets:
      all_secrets.update(value for value in extra_secrets if value)

    for secret in sorted(all_secrets, key=len, reverse=True):
      if secret and len(secret) >= 3:
        redacted = redacted.replace(secret, "[secret]")

    redacted = re.sub(
      r"((?:PASSWORD|SECRET|TOKEN)\s*[=:]\s*)([^\s,;]+)",
      r"\1[secret]",
      redacted,
      flags=re.IGNORECASE,
    )
    return redacted

  def flush_log_queue(self) -> None:
    try:
      while True:
        line = self.log_queue.get_nowait()
        self.logs_text.configure(state="normal")
        self.logs_text.insert("end", line)
        self.logs_text.see("end")
        self.logs_text.configure(state="disabled")
    except queue.Empty:
      pass

    self.after(100, self.flush_log_queue)

  def update_secret_values(self) -> None:
    env = read_env_file(self.env_path)
    values = {
      value
      for key, value in env.items()
      if value and (SENSITIVE_KEY_PATTERN.search(key) or key == "DB_PASSWORD")
    }
    db_settings = read_db_settings(env)
    if db_settings.get("DB_PASSWORD"):
      values.add(db_settings["DB_PASSWORD"])
    self.secret_values = values

  def load_state(self) -> dict[str, int]:
    try:
      if not self.state_path.exists():
        return {}
      data = json.loads(self.state_path.read_text(encoding="utf-8"))
      return {
        key: int(value)
        for key, value in data.items()
        if key in {BACKEND_KEY, FRONTEND_KEY}
      }
    except Exception:
      return {}

  def save_state(self) -> None:
    self.state_dir.mkdir(parents=True, exist_ok=True)
    live_state = {
      key: pid
      for key, pid in self.known_pids.items()
      if pid and is_pid_alive(pid)
    }
    self.state_path.write_text(
      json.dumps(live_state, ensure_ascii=False, indent=2),
      encoding="utf-8",
    )

  def set_launch_status(self, value: str) -> None:
    self.set_var(self.launch_status, value)

  def set_buttons_state(self, state: str) -> None:
    self.after(0, lambda: self.start_button.configure(state=state))
    self.after(0, lambda: self.stop_button.configure(state=state))

  def set_var(self, variable: tk.StringVar, value: str) -> None:
    self.after(0, lambda: variable.set(value))

  def run_background(self, target) -> None:
    threading.Thread(target=target, daemon=True).start()

  def on_close(self) -> None:
    running = self.is_started_by_launcher(BACKEND_KEY) or self.is_started_by_launcher(FRONTEND_KEY)
    if running:
      answer = messagebox.askyesnocancel(
        APP_NAME,
        "Проект запущен лаунчером. Остановить процессы перед закрытием?",
      )
      if answer is None:
        return
      if answer:
        self._stop_project()
    self.destroy()


def add_label_row(parent: ttk.Frame, row: int, label: str, variable: tk.StringVar) -> None:
  ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=4, padx=(0, 10))
  ttk.Label(parent, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=4)


def add_copyable_row(parent: ttk.Frame, row: int, label: str, variable: tk.StringVar) -> None:
  ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", pady=4, padx=(0, 10))
  entry = ttk.Entry(parent, textvariable=variable)
  entry.grid(row=row, column=1, sticky="ew", pady=4)


def find_project_root() -> Path:
  if getattr(sys, "frozen", False):
    base = Path(sys.executable).resolve().parent
    candidates = [base, base.parent, Path.cwd()]
  else:
    base = Path(__file__).resolve()
    candidates = [base.parent.parent, Path.cwd()]

  for candidate in candidates:
    if (candidate / "apps" / "api" / "package.json").exists():
      return candidate

  return candidates[0]


def find_package_manager() -> Path | None:
  for name in ["pnpm.cmd", "pnpm", "npm.cmd", "npm"]:
    command = shutil.which(name)
    if command:
      return Path(command)
  return None


def windows_creation_flags() -> int:
  if not sys.platform.startswith("win"):
    return 0

  flags = 0
  flags |= getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
  flags |= getattr(subprocess, "CREATE_NO_WINDOW", 0)
  return flags


def read_env_file(path: Path) -> dict[str, str]:
  if not path.exists():
    return {}

  env: dict[str, str] = {}
  for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
    line = raw_line.strip()
    if not line or line.startswith("#") or "=" not in line:
      continue

    key, value = line.split("=", 1)
    env[key.strip()] = unquote_env_value(value.strip())

  return env


def update_env_file(path: Path, updates: dict[str, str]) -> None:
  lines = path.read_text(encoding="utf-8", errors="replace").splitlines() if path.exists() else []
  seen: set[str] = set()
  updated_lines: list[str] = []

  for raw_line in lines:
    match = re.match(r"^(\s*([^#=\s]+)\s*=).*$", raw_line)
    if not match:
      updated_lines.append(raw_line)
      continue

    key = match.group(2)
    if key in updates:
      updated_lines.append(f"{key}={format_env_value(updates[key])}")
      seen.add(key)
    else:
      updated_lines.append(raw_line)

  missing = [key for key in updates if key not in seen]
  if missing:
    if updated_lines and updated_lines[-1].strip():
      updated_lines.append("")
    updated_lines.append("# Database settings managed by launcher")
    for key in missing:
      updated_lines.append(f"{key}={format_env_value(updates[key])}")

  path.write_text("\n".join(updated_lines) + "\n", encoding="utf-8")


def unquote_env_value(value: str) -> str:
  if len(value) >= 2 and ((value[0] == value[-1] == '"') or (value[0] == value[-1] == "'")):
    return value[1:-1]
  return value


def format_env_value(value: str) -> str:
  if re.search(r"\s|#", value):
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'
  return value


def read_db_settings(env: dict[str, str]) -> dict[str, str]:
  settings = {key: env[key] for key in DB_ENV_KEYS if key in env}
  if all(key in settings for key in DB_ENV_KEYS):
    return settings

  database_url = env.get("DATABASE_URL")
  if not database_url:
    return settings

  parsed = urlparse(database_url)
  db_name = parsed.path.lstrip("/")
  if parsed.hostname:
    settings.setdefault("DB_HOST", parsed.hostname)
  if parsed.port:
    settings.setdefault("DB_PORT", str(parsed.port))
  if db_name:
    settings.setdefault("DB_NAME", unquote(db_name))
  if parsed.username:
    settings.setdefault("DB_USER", unquote(parsed.username))
  if parsed.password:
    settings.setdefault("DB_PASSWORD", unquote(parsed.password))

  return settings


def build_postgres_url(
  host: str,
  port: str,
  database: str,
  user: str,
  password: str,
  query: str,
) -> str:
  credentials = quote(user, safe="")
  credentials += ":" + quote(password, safe="")
  path = "/" + quote(database, safe="")
  return f"postgresql://{credentials}@{host}:{port}{path}" + (f"?{query}" if query else "")


def parse_port(value: str | None, default: int) -> int:
  if not value:
    return default
  try:
    port = int(value)
    return port if 0 < port < 65536 else default
  except ValueError:
    return default


def detect_lan_ip() -> str | None:
  try:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
      sock.connect(("8.8.8.8", 80))
      ip = sock.getsockname()[0]
      if is_usable_lan_ip(ip):
        return ip
  except OSError:
    pass

  try:
    host_name = socket.gethostname()
    for ip in socket.gethostbyname_ex(host_name)[2]:
      if is_usable_lan_ip(ip):
        return ip
  except OSError:
    pass

  return None


def is_usable_lan_ip(ip: str) -> bool:
  return not (
    ip.startswith("127.")
    or ip.startswith("169.254.")
    or ip == "0.0.0.0"
  )


def is_port_open(host: str, port: int, timeout: float = 0.25) -> bool:
  try:
    with socket.create_connection((host, port), timeout=timeout):
      return True
  except OSError:
    return False


def wait_for_port(port: int, timeout_seconds: int) -> bool:
  deadline = time.time() + timeout_seconds
  while time.time() < deadline:
    if is_port_open("127.0.0.1", port, timeout=0.5):
      return True
    time.sleep(0.5)
  return False


def is_pid_alive(pid: int) -> bool:
  if pid <= 0:
    return False

  try:
    os.kill(pid, 0)
    return True
  except OSError:
    return False


def terminate_process_tree(pid: int, force: bool = False) -> None:
  if sys.platform.startswith("win"):
    args = ["taskkill", "/PID", str(pid), "/T"]
    if force:
      args.append("/F")
    subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    return

  try:
    os.kill(pid, signal.SIGTERM)
  except OSError:
    return


def status_text(
  key: str,
  port: int,
  services: dict[str, ServiceProcess],
  known_pids: dict[str, int],
) -> str:
  service = services.get(key)
  if service and service.process.poll() is None:
    return f"работает, PID {service.process.pid}"

  pid = known_pids.get(key)
  if pid and is_pid_alive(pid):
    return f"работает, PID {pid}"

  if is_port_open("127.0.0.1", port):
    return f"порт {port} занят внешним процессом"

  return "остановлен"


def dedupe(values: Iterable[str]) -> list[str]:
  result: list[str] = []
  seen: set[str] = set()
  for value in values:
    if value in seen:
      continue
    seen.add(value)
    result.append(value)
  return result


def main() -> None:
  app = LauncherApp()
  app.mainloop()


if __name__ == "__main__":
  main()
