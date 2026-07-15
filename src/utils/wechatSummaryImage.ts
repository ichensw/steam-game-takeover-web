import { todayString } from './wechatBot';
import type { WechatSummary } from '../api/wechatBot';

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let current = '';
    for (const character of paragraph) {
      if (current && context.measureText(current + character).width > maxWidth) {
        lines.push(current);
        current = character;
      } else {
        current += character;
      }
    }
    lines.push(current || ' ');
  }
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

export async function exportWechatSummaryImage(result: WechatSummary) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持图片导出');

  const report = result.report;
  const topics = (report?.topics || []).slice(0, 5);
  const overview = report?.overview || result.summary;
  const meta = `${result.roomName || result.roomId || '全部群聊'} · ${result.messageCount || 0} 条消息 · ${result.speakerCount || 0} 位发言人`;
  context.font = '30px system-ui, sans-serif';
  const overviewLines = wrapText(context, overview, 840).slice(0, 4);
  const topicSections = topics.map((topic) => ({
    title: topic.title,
    meta: `${topic.messageCount || 0} 条 / ${topic.speakerCount || 0} 人`,
    lines: wrapText(context, topic.summary || '无摘要', 820).slice(0, 4),
  }));
  const buckets = [
    ...(report?.importantInfo || []).slice(0, 3).map((item) => `重要：${item}`),
    ...(report?.memes || []).slice(0, 3).map((item) => `热点：${item}`),
  ].join('\n') || '无明显重要信息';
  const bucketLines = wrapText(context, buckets, 840).slice(0, 8);
  canvas.height = Math.max(
    900,
    430 + overviewLines.length * 46 + topicSections.reduce((height, section) => height + 112 + section.lines.length * 38, 0) + bucketLines.length * 34,
  );

  context.fillStyle = '#111315';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#22b8cf';
  context.fillRect(0, 0, 18, canvas.height);
  context.fillStyle = '#f3c969';
  context.fillRect(72, 72, 76, 8);
  context.fillStyle = '#f7f8fa';
  context.font = '700 56px system-ui, sans-serif';
  context.fillText('微信群聊总结', 72, 154);
  context.fillStyle = '#a9b0b8';
  context.font = '24px system-ui, sans-serif';
  context.fillText(meta, 72, 204);
  context.fillText(`导出时间 ${new Date().toLocaleString('zh-CN', { hour12: false })}`, 72, 244);

  let y = 286;
  let height = 82 + overviewLines.length * 46;
  context.fillStyle = '#20262a';
  roundedRect(context, 64, y, 944, height, 8);
  context.fill();
  context.fillStyle = '#62d4e7';
  context.font = '700 29px system-ui, sans-serif';
  context.fillText('一句话概览', 100, y + 46);
  context.fillStyle = '#e2e5e9';
  context.font = '32px system-ui, sans-serif';
  overviewLines.forEach((line, lineIndex) => context.fillText(line, 100, y + 96 + lineIndex * 46));
  y += height + 18;

  topicSections.forEach((section, index) => {
    height = 94 + section.lines.length * 38;
    context.fillStyle = '#191c1f';
    roundedRect(context, 64, y, 944, height, 8);
    context.fill();
    context.fillStyle = '#f3c969';
    context.font = '700 28px system-ui, sans-serif';
    context.fillText(`${index + 1}. ${section.title}`, 100, y + 42);
    context.fillStyle = '#9099a6';
    context.font = '22px system-ui, sans-serif';
    context.fillText(section.meta, 100, y + 72);
    context.fillStyle = '#e2e5e9';
    context.font = '27px system-ui, sans-serif';
    section.lines.forEach((line, lineIndex) => context.fillText(line, 100, y + 112 + lineIndex * 38));
    y += height + 18;
  });

  height = 70 + bucketLines.length * 34;
  context.fillStyle = '#191c1f';
  roundedRect(context, 64, y, 944, height, 8);
  context.fill();
  context.fillStyle = '#f3c969';
  context.font = '700 28px system-ui, sans-serif';
  context.fillText('值得注意', 100, y + 42);
  context.fillStyle = '#e2e5e9';
  context.font = '25px system-ui, sans-serif';
  bucketLines.forEach((line, lineIndex) => context.fillText(line, 100, y + 84 + lineIndex * 34));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('图片生成失败，请稍后重试');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `wechat-summary-${todayString()}.png`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
