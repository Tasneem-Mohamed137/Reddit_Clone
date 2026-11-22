import { postActionService } from '../services/postAction.service.js';
import { postService } from '../services/post.service.js';

export const postActionController = {
  async save(req, res) {
    res.json(await postActionService.save(req.userId, req.params.id, true));
  },
  async unsave(req, res) {
    res.json(await postActionService.save(req.userId, req.params.id, false));
  },
  async hide(req, res) {
    res.json(await postActionService.hide(req.userId, req.params.id, true));
  },
  async unhide(req, res) {
    res.json(await postActionService.hide(req.userId, req.params.id, false));
  },
  async report(req, res) {
    res.json(await postActionService.report(req.userId, req.params.id, req.body.reason));
  },
  async pin(req, res) {
    res.json(await postActionService.pin(req.userId, req.params.id, true));
  },
  async unpin(req, res) {
    res.json(await postActionService.pin(req.userId, req.params.id, false));
  },
  async reports(req, res) {
    res.json({ items: await postActionService.listReports(req.userId, req.params.name) });
  },
  async saved(req, res) {
    res.json(await postService.listSaved(req.userId, req.query));
  },
};