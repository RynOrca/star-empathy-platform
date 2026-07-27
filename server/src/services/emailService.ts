/**
 * 邮件服务
 * 开发环境：将验证码打印到控制台
 * 生产环境：通过 SMTP（Nodemailer）发送邮件
 *
 * 配置环境变量：
 *   SMTP_HOST — SMTP 服务器地址
 *   SMTP_PORT — SMTP 端口（默认 587）
 *   SMTP_USER — SMTP 用户名
 *   SMTP_PASS — SMTP 密码
 *   SMTP_FROM — 发件人地址
 */

const isDev = process.env.NODE_ENV !== 'production';

export async function sendResetCode(email: string, code: string): Promise<boolean> {
  const subject = '星语穹庭 — 密码重置验证码';
  const html = `
    <div style="max-width:480px;margin:0 auto;padding:24px;font-family:'Microsoft YaHei',sans-serif;background:#0a0a1e;color:#e0d8ff;border-radius:12px;border:1px solid #303757">
      <h2 style="color:#ffd98a;margin:0 0 16px">🌟 星语穹庭</h2>
      <p style="font-size:15px;line-height:1.7">你正在重置密码，验证码如下：</p>
      <div style="background:#16182b;border:1px solid #303757;border-radius:8px;padding:16px;text-align:center;margin:16px 0">
        <span style="font-size:28px;font-weight:700;letter-spacing:6px;color:#ffd98a">${code}</span>
      </div>
      <p style="font-size:13px;color:#5a5580;line-height:1.6">验证码 10 分钟内有效。如非本人操作，请忽略此邮件。</p>
      <hr style="border:none;border-top:1px solid #303757;margin:16px 0" />
      <p style="font-size:11px;color:#3a3560">星语穹庭 · 把心事挂上星星</p>
    </div>
  `;

  if (isDev) {
    console.log(`\n[email] ───── 开发模式：验证码未发送邮件 ─────`);
    console.log(`[email] 收件人: ${email}`);
    console.log(`[email] 验证码: ${code}`);
    console.log(`[email] ────────────────────────────────────────\n`);
    return true;
  }

  // 生产环境：通过 SMTP 发送
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.error('[email] SMTP 未配置，无法发送邮件。请设置 SMTP_HOST / SMTP_USER / SMTP_PASS 环境变量');
    return false;
  }

  try {
    // 动态导入 nodemailer（避免开发环境强制依赖）
    // @ts-ignore — nodemailer 为可选依赖，生产环境按需安装
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({ from: from || user, to: email, subject, html });
    console.log(`[email] 密码重置邮件已发送至 ${email}`);
    return true;
  } catch (error: any) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' || error.message?.includes('Cannot find')) {
      console.error('[email] nodemailer 未安装。生产环境请运行: npm install nodemailer');
    } else {
      console.error('[email] 发送失败:', error);
    }
    return false;
  }
}