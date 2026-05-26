import { type DragEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/auth';
import {
  create,
  getProjectImageUrl,
  list as listProjects,
  remove,
  update,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
} from '../api/projects';
import AdminLayout from '../layout/AdminLayout';
import type { Project } from '../types';
import { formatProjectNumber, getProjectMeta } from '../utils/projects';

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;

type ModalMode = 'create' | 'edit';

type ProjectFormValues = {
  title: string;
  description: string;
  image?: File | null;
};

type ProjectModalProps = {
  mode: ModalMode;
  project: Project | null;
  submitting: boolean;
  serverError: string;
  onCancel: () => void;
  onSubmit: (values: ProjectFormValues) => Promise<boolean>;
};

function getUploadError(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return 'Загрузите JPG, PNG или WEBP.';
  }

  if (file.size > maxImageSize) {
    return 'Файл больше 5 МБ. Выберите изображение до 5 МБ.';
  }

  return '';
}

function ProjectModal({ mode, project, submitting, serverError, onCancel, onSubmit }: ProjectModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(project ? getProjectImageUrl(project) : '');
  const [imageError, setImageError] = useState('');
  const [formError, setFormError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!image) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(image);
    setImagePreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [image]);

  const applyFile = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const error = getUploadError(file);
    if (error) {
      setImageError(error);
      setImage(null);
      if (mode === 'create') {
        setImagePreview('');
      }
      return;
    }

    setImage(file);
    setImageError('');
    setFormError('');
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    applyFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Введите название работы.');
      return;
    }

    if (mode === 'create' && !image) {
      setFormError('Добавьте изображение работы.');
      return;
    }

    const saved = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      image,
    });

    if (!saved) {
      return;
    }
  };

  return (
    <div className="project-modal-backdrop" role="presentation">
      <section className="project-modal" role="dialog" aria-modal="true">
        <header>
          <h2>{mode === 'create' ? 'НОВАЯ РАБОТА' : 'РЕДАКТИРОВАТЬ РАБОТУ'}</h2>
          <button type="button" onClick={onCancel} aria-label="Закрыть">
            ×
          </button>
        </header>

        <form className="project-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>НАЗВАНИЕ</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label>
            <span>ОПИСАНИЕ</span>
            <textarea
              value={description}
              placeholder="Материалы, размер, особенности — коротко."
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="project-image-field">
            <span>ИЗОБРАЖЕНИЕ</span>
            <input
              ref={inputRef}
              className="project-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => applyFile(event.target.files?.[0])}
            />

            {mode === 'create' ? (
              <button
                className={dragActive ? 'project-dropzone active' : 'project-dropzone'}
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                {imagePreview ? <img src={imagePreview} alt="" /> : null}
                <strong>{image ? image.name : 'ПЕРЕТАЩИТЕ ФАЙЛ ИЛИ НАЖМИТЕ'}</strong>
                <small>JPG, PNG, WEBP · ДО 5 МБ</small>
              </button>
            ) : (
              <div className="project-edit-image">
                {imagePreview ? <img src={imagePreview} alt="" /> : <div>НЕТ ФОТО</div>}
                <button type="button" onClick={() => inputRef.current?.click()}>
                  ЗАМЕНИТЬ ИЗОБРАЖЕНИЕ
                </button>
              </div>
            )}

            {imageError ? <p className="form-error">{imageError}</p> : null}
          </div>

          {formError ? <p className="form-error">{formError}</p> : null}
          {serverError ? <p className="form-error">{serverError}</p> : null}

          <div className="project-form-actions">
            <button className="button-primary" type="submit" disabled={submitting}>
              {submitting ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
            </button>
            <button className="button-ghost" type="button" onClick={onCancel}>
              ОТМЕНА
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [editableProject, setEditableProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listProjects();
      setProjects(response);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setError('Войдите как мастер, чтобы управлять портфолио.');
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 403) {
        setError('Недостаточно прав для управления портфолио.');
        return;
      }

      setError('Не удалось загрузить портфолио.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const openCreateModal = () => {
    setEditableProject(null);
    setModalError('');
    setModalMode('create');
  };

  const openEditModal = (project: Project) => {
    setEditableProject(project);
    setModalError('');
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditableProject(null);
    setModalError('');
  };

  const handleSubmit = async (values: ProjectFormValues) => {
    setSubmitting(true);
    setModalError('');

    try {
      if (modalMode === 'create' && values.image) {
        const payload: ProjectCreatePayload = {
          title: values.title,
          description: values.description,
          image: values.image,
        };
        const response = await create(payload);
        setProjects((currentProjects) => [response.project, ...currentProjects]);
      }

      if (modalMode === 'edit' && editableProject) {
        const payload: ProjectUpdatePayload = {
          title: values.title,
          description: values.description,
          image: values.image,
        };
        const response = await update(editableProject.id, payload);
        setProjects((currentProjects) =>
          currentProjects.map((project) =>
            project.id === response.project.id ? response.project : project,
          ),
        );
      }

      closeModal();
      return true;
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'LIMIT_FILE_SIZE') {
        setModalError('Файл больше 5 МБ. Выберите изображение до 5 МБ.');
        return false;
      }

      if (requestError instanceof ApiError && requestError.code === 'INVALID_MIME') {
        setModalError('Загрузите JPG, PNG или WEBP.');
        return false;
      }

      if (requestError instanceof ApiError && requestError.status === 403) {
        setModalError('Недостаточно прав для сохранения работы.');
        return false;
      }

      setModalError('Не удалось сохранить работу.');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(`Удалить работу «${project.title}»?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(project.id);
    setError('');

    try {
      await remove(project.id);
      setProjects((currentProjects) => currentProjects.filter((item) => item.id !== project.id));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 403) {
        setError('Недостаточно прав для удаления работы.');
        return;
      }

      setError('Не удалось удалить работу.');
    } finally {
      setDeletingId(null);
    }
  };

  const hasProjects = projects.length > 0;

  return (
    <AdminLayout>
      <section className="admin-page admin-projects-page">
        <header className="admin-projects-header">
          <h1>ПОРТФОЛИО</h1>
          {!loading && hasProjects ? (
            <button className="button-primary admin-project-add" type="button" onClick={openCreateModal}>
              + ДОБАВИТЬ РАБОТУ
            </button>
          ) : null}
        </header>

        {error ? <p className="admin-message error">{error}</p> : null}
        {loading ? <p className="admin-message">ЗАГРУЗКА ПОРТФОЛИО...</p> : null}

        {!loading && !error && !hasProjects ? (
          <div className="admin-project-empty-state">
            <h2>ПОКА НЕТ НИ ОДНОЙ РАБОТЫ</h2>
            <p>Добавьте первую работу, чтобы клиенты увидели ваше портфолио на главной странице.</p>
            <button className="button-primary" type="button" onClick={openCreateModal}>
              + ДОБАВИТЬ ПЕРВУЮ РАБОТУ
            </button>
          </div>
        ) : null}

        {!loading && hasProjects ? (
          <div className="admin-project-grid">
            {projects.map((project) => (
              <article className="admin-project-card" key={project.id}>
                <div className="admin-project-card-meta">
                  <p>({formatProjectNumber(project.id)})</p>
                  <h2>{project.title}</h2>
                  <span>[{getProjectMeta(project.description)}]</span>
                  <div className="admin-project-card-actions">
                    <button type="button" onClick={() => openEditModal(project)}>
                      РЕДАКТИРОВАТЬ
                    </button>
                    <button
                      className="danger"
                      type="button"
                      disabled={deletingId === project.id}
                      onClick={() => void handleDelete(project)}
                    >
                      {deletingId === project.id ? 'УДАЛЕНИЕ...' : 'УДАЛИТЬ'}
                    </button>
                  </div>
                </div>
                {project.image_url ? (
                  <img src={getProjectImageUrl(project)} alt="" />
                ) : (
                  <div className="project-image-fallback">НЕТ ФОТО</div>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {modalMode ? (
        <ProjectModal
          key={`${modalMode}-${editableProject?.id ?? 'new'}`}
          mode={modalMode}
          project={editableProject}
          submitting={submitting}
          serverError={modalError}
          onCancel={closeModal}
          onSubmit={handleSubmit}
        />
      ) : null}
    </AdminLayout>
  );
}
