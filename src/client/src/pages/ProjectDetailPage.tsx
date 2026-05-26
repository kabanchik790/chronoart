import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ApiError } from '../api/auth';
import { IconArrowLeft } from '../assets/icons';
import { get, getProjectImageUrl } from '../api/projects';
import type { Project } from '../types';
import { formatProjectNumber, getProjectMeta } from '../utils/projects';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ru-RU');
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = useMemo(() => {
    const parsed = Number.parseInt(id ?? '', 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [id]);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setError('Некорректный номер работы.');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    void get(projectId)
      .then((response) => {
        if (!cancelled) {
          setProject(response.project);
        }
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError instanceof ApiError && requestError.status === 404) {
          setError('Работа не найдена.');
          return;
        }

        setError('Не удалось загрузить работу.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <section className="project-detail-page">
      <NavLink className="project-back-link" to="/projects">
        <IconArrowLeft size={16} /> К ПОРТФОЛИО
      </NavLink>

      {loading ? <p className="projects-state">ЗАГРУЗКА РАБОТЫ...</p> : null}
      {error ? <p className="projects-state error">{error}</p> : null}

      {project ? (
        <article className="project-detail-layout">
          <div className="project-detail-image">
            {project.image_url ? (
              <img src={getProjectImageUrl(project)} alt="" />
            ) : (
              <div className="project-image-fallback">НЕТ ФОТО</div>
            )}
          </div>

          <div className="project-detail-copy">
            <p className="project-detail-number">({formatProjectNumber(project.id)})</p>
            <h1>{project.title}</h1>
            <p className="project-detail-meta">[{getProjectMeta(project.description)}]</p>
            <dl className="project-detail-specs">
              <div>
                <dt>Характеристики</dt>
                <dd>{getProjectMeta(project.description)}</dd>
              </div>
              <div>
                <dt>Добавлено</dt>
                <dd>{formatDate(project.created_at)}</dd>
              </div>
            </dl>
            <p className="project-detail-description">
              {project.description || 'Описание появится после уточнения деталей работы.'}
            </p>
            <NavLink className="button-primary project-detail-cta" to="/#wizard">
              ЗАКАЗАТЬ ПОХОЖИЕ
            </NavLink>
          </div>
        </article>
      ) : null}
    </section>
  );
}
