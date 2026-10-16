import { jsPDF } from 'jspdf';

export function createBasicPdf(result, date = new Date()) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'MacroForge daily calories', creator: 'MacroForge' });
  doc.setFillColor('#c8ed65'); doc.rect(0, 0, 210, 3, 'F');
  doc.setTextColor('#19202e'); doc.setFont('helvetica', 'bold');
  doc.setFontSize(18); doc.text('MacroForge', 20, 25);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.setTextColor('#596575'); doc.text(date.toLocaleDateString('en-GB'), 190, 25, { align: 'right' });
  doc.setFontSize(12); doc.text('Your daily calorie target', 20, 47);
  doc.setFillColor('#19202e'); doc.roundedRect(20, 57, 170, 44, 4, 4, 'F');
  doc.setTextColor('#d6f58e'); doc.setFont('helvetica', 'bold');
  doc.setFontSize(34); doc.text(`${result.calories.toLocaleString('en-US')}`, 28, 80);
  doc.setFontSize(11); doc.setTextColor('#ffffff'); doc.text('kcal / day', 28, 91);
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#596575'); doc.setFontSize(10);
  doc.text('A starting estimate, not medical advice.', 20, 116);
  doc.text('Review your progress every 2-3 weeks and adjust as needed.', 20, 124);
  doc.setFontSize(9); doc.text('Basic PDF / Daily calories only', 20, 280);
  doc.text('1 / 1', 190, 280, { align: 'right' });
  return doc;
}
