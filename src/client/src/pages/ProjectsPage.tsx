import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjectImageUrl, list as listProjects } from '../api/projects';
import PageShell from '../components/PageShell';
import type { Project } from '../types';
import { formatProjectNumber, getProjectMeta } from '../utils/projects';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listProjects();
      setProjects(response);
    } catch {
      setError('Не удалось загрузить портфолио.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  return (
    <PageShell className="projects-page" eyebrow="/projects" title="ПОРТФОЛИО">
      {loading ? <p className="projects-state">ЗАГРУЗКА ПОРТФОЛИО...</p> : null}
      {error ? <p className="projects-state error">{error}</p> : null}

      {!loading && !error && projects.length === 0 ? (
        <p className="projects-state">ПОКА НЕТ НИ ОДНОЙ РАБОТЫ</p>
      ) : null}

      {!loading && !error && projects.length > 0 ? (
        <div className="portfolio-grid">
          {projects.map((project, index) => (
            <Link className="portfolio-card" key={project.id} to={`/project/${project.id}`}>
              <div className="portfolio-card-heading">
                <p>({formatProjectNumber(index + 1)})</p>
                <div>
                  <h2>{project.title}</h2>
                  <span>[{getProjectMeta(project.description)}]</span>
                </div>
              </div>
              {project.image_url ? (
                <img src={getProjectImageUrl(project)} alt="" draggable="false" />
              ) : (
                <div className="project-image-fallback">НЕТ ФОТО</div>
              )}
            </Link>
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}
