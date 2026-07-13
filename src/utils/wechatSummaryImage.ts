import { todayString } from './wechatBot';

type SummarySection = { title: string; content: string };

function splitSections(summary: string): SummarySection[] {
  const matches = [...summary.matchAll(/【([^】]+)】/g)];
  if (!matches.length) return [{ title: '总结内容', content: summary }];
  return matches.map((match, index) => {
    const start = (match.index || 0) + match[0].length;
    const end = matches[index + 1]?.index ?? summary.length;
    return { title: match[1], content: summary.slice(start, end).trim() || '无' };
  });
}

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

export async function exportWechatSummaryImage(summary: string, meta: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持图片导出');

  context.font = '30px system-ui, sans-serif';
  const sections = splitSections(summary).map((section) => ({
    ...section,
    lines: wrapText(context, section.content, 840),
  }));
  canvas.height = Math.max(720, 310 + sections.reduce((height, section) => height + 96 + section.lines.length * 42, 0));

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
  sections.forEach((section, index) => {
    const height = 76 + section.lines.length * 42;
    context.fillStyle = index === 0 ? '#20262a' : '#191c1f';
    roundedRect(context, 64, y, 944, height, 8);
    context.fill();
    context.fillStyle = index === 0 ? '#62d4e7' : '#f3c969';
    context.font = '700 29px system-ui, sans-serif';
    context.fillText(section.title, 100, y + 46);
    context.fillStyle = '#e2e5e9';
    context.font = '30px system-ui, sans-serif';
    section.lines.forEach((line, lineIndex) => context.fillText(line, 100, y + 94 + lineIndex * 42));
    y += height + 18;
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('图片生成失败，请稍后重试');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `wechat-summary-${todayString()}.png`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
