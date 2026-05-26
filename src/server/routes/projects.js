const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { Project, sequelize } = require('../models');
const requireAdmin = require('../middleware/requireAdmin');
const { uploadProject } = require('../middleware/upload');

// GET /api/projects — публично
router.get('/projects', async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      order: [['created_at', 'DESC']],
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id — публично
router.get('/projects/:id', async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — requireAdmin + multer
router.post('/projects', requireAdmin, uploadProject, async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title || !req.file) {
      if (req.file) {
        fs.unlink(req.file.path, (e) => { if (e) console.error('[fs.unlink] orphan after validation:', e); });
      }
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'title and image are required' });
    }

    const imageUrl = `uploads/projects/${req.file.filename}`;
    const project = await Project.create({
      title: title.trim(),
      description: description ? description.trim() : null,
      image_url: imageUrl,
    });

    res.status(201).json({ project });
  } catch (err) {
    if (req.file) {
      fs.unlink(req.file.path, (e) => { if (e) console.error('[fs.unlink] orphan after DB error:', e); });
    }
    next(err);
  }
});

// PUT /api/projects/:id — requireAdmin + multer
router.put('/projects/:id', requireAdmin, uploadProject, async (req, res, next) => {
  // Сохраняем данные нового файла до try/catch, чтобы очистить при ошибке
  const newFilePath = req.file ? req.file.path : null;
  const newImageUrl = req.file ? `uploads/projects/${req.file.filename}` : null;

  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      if (newFilePath) {
        fs.unlink(newFilePath, (e) => { if (e) console.error('[fs.unlink] orphan (404):', e); });
      }
      return res.status(404).json({ message: 'Not found' });
    }

    const updates = {};
    if (req.body.title !== undefined) updates.title = req.body.title.trim();
    if (req.body.description !== undefined) updates.description = req.body.description.trim() || null;

    if (newImageUrl) {
      // С новым файлом: сохраняем старый путь, обновляем в транзакции
      const oldImageUrl = project.image_url;
      updates.image_url = newImageUrl;

      await sequelize.transaction(async (t) => {
        await project.update(updates, { transaction: t });
      });

      // После COMMIT: удаляем старый файл
      if (oldImageUrl) {
        const oldAbsPath = path.join(__dirname, '..', oldImageUrl);
        fs.unlink(oldAbsPath, (e) => { if (e) console.error('[fs.unlink] old image after COMMIT:', e); });
      }
    } else {
      // Без нового файла: обновляем только title/description, image_url не трогаем
      await project.update(updates);
    }

    res.json({ project });
  } catch (err) {
    // Ошибка/ROLLBACK: удаляем новый файл, чтобы не оставить orphan
    if (newFilePath) {
      fs.unlink(newFilePath, (e) => { if (e) console.error('[fs.unlink] new image on error:', e); });
    }
    next(err);
  }
});

// DELETE /api/projects/:id — requireAdmin
router.delete('/projects/:id', requireAdmin, async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'Not found' });

    const imageUrl = project.image_url;

    // Сначала DELETE в транзакции
    await sequelize.transaction(async (t) => {
      await project.destroy({ transaction: t });
    });

    // После COMMIT: удаляем файл
    if (imageUrl) {
      const absPath = path.join(__dirname, '..', imageUrl);
      fs.unlink(absPath, (e) => { if (e) console.error('[fs.unlink] project image after DELETE:', e); });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
