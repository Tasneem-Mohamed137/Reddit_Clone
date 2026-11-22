import { searchService } from '../services/search.service.js';

export const searchController = {
  async search(req, res) {
    res.json({ items: await searchService.search(req.query) });
  },
};