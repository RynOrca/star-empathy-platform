import { Router, Request, Response } from 'express';
import { getAllStars, createStar, resonate } from '../services/starService';

const router = Router();

// 获取所有星星
router.get('/', (_req: Request, res: Response) => {
  try {
    const stars = getAllStars();
    res.json({ code: 200, message: 'success', data: stars });
  } catch (error) {
    console.error('GET /api/stars error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 投递心事/创建星星
router.post('/story', (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    // 校验 content
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ code: 400, message: 'content 不能为空', data: null });
    }

    const trimmed = content.trim();
    if (trimmed.length === 0 || trimmed.length > 300) {
      return res.status(400).json({ code: 400, message: 'content 长度需在 1~300 字之间', data: null });
    }

    // 转义 HTML 特殊字符，防止 XSS
    const safeContent = trimmed.replace(/[<>&"]/g, (c) => {
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
      };
      return map[c] || c;
    });

    const star = createStar(safeContent);
    res.status(200).json({ code: 200, message: '故事已化作星光', data: star });
  } catch (error) {
    console.error('POST /api/stars/story error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

// 共鸣点亮
router.post('/:id/resonate', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      return res.status(400).json({ code: 400, message: '无效的 id', data: null });
    }

    const result = resonate(id);

    if (!result) {
      return res.status(404).json({ code: 404, message: '星星不存在', data: null });
    }

    res.json({ code: 200, message: '共鸣已点亮', data: result });
  } catch (error) {
    console.error('POST /api/stars/:id/resonate error:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
  }
});

export default router;
