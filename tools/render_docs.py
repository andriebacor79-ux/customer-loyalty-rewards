"""Regenerate Documentation.pdf from Documentation.md. Requires reportlab."""
from pathlib import Path
from html import escape
import re
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
FONT_DIR=Path(__file__).resolve().parent/'fonts'
pdfmetrics.registerFont(TTFont('DocSans',str(FONT_DIR/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('DocSans-Bold',str(FONT_DIR/'DejaVuSans-Bold.ttf')))
pdfmetrics.registerFont(TTFont('DocMono',str(FONT_DIR/'DejaVuSansMono.ttf')))
pdfmetrics.registerFontFamily('DocSans',normal='DocSans',bold='DocSans-Bold',italic='DocSans',boldItalic='DocSans-Bold')
P=Path(__file__).resolve().parents[1]
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BodyCustom',fontName='DocSans',fontSize=9.5,leading=13.5,spaceAfter=7,textColor=colors.HexColor('#243449')))
styles.add(ParagraphStyle(name='CellCustom',fontName='DocSans',fontSize=8,leading=11,spaceAfter=0,wordWrap='CJK'))
styles.add(ParagraphStyle(name='CodeCustom',fontName='DocMono',fontSize=7.5,leading=11,backColor=colors.HexColor('#f0f4f8'),borderPadding=8,spaceAfter=10))
styles['Title'].fontName='DocSans-Bold';styles['Heading1'].fontName='DocSans-Bold';styles['Heading2'].fontName='DocSans-Bold'
styles['Title'].fontSize=25;styles['Title'].leading=31;styles['Title'].textColor=colors.HexColor('#133853')
styles['Heading1'].fontSize=20;styles['Heading1'].leading=26;styles['Heading1'].textColor=colors.HexColor('#133853')
styles['Heading2'].fontSize=12;styles['Heading2'].leading=16;styles['Heading2'].textColor=colors.HexColor('#167970')
def para(s,style='BodyCustom'):
 s=escape(s).replace('\n','<br/>');s=re.sub(r'`([^`]+)`',r'<font name="DocMono">\1</font>',s);s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
 return Paragraph(s,styles[style])
def box(d,x,y,w,h,title,sub=''):
 d.add(Rect(x,y,w,h,rx=5,ry=5,fillColor=colors.HexColor('#edf5f6'),strokeColor=colors.HexColor('#167970')))
 d.add(String(x+w/2,y+h-19,title,textAnchor='middle',fontName='DocSans-Bold',fontSize=8,fillColor=colors.HexColor('#133853')))
 if sub:
  for i,line in enumerate(sub.split('\n')):d.add(String(x+8,y+h-34-12*i,line,fontName='DocSans',fontSize=8,fillColor=colors.HexColor('#243449')))
def arrow(d,x1,y1,x2,y2,label=''):
 d.add(Line(x1,y1,x2,y2,strokeColor=colors.HexColor('#526a7b')))
 import math
 a=math.atan2(y2-y1,x2-x1);l=6
 d.add(Polygon([x2,y2,x2-l*math.cos(a-.5),y2-l*math.sin(a-.5),x2-l*math.cos(a+.5),y2-l*math.sin(a+.5)],fillColor=colors.HexColor('#526a7b'),strokeColor=None))
 if label:d.add(String((x1+x2)/2+4,(y1+y2)/2+4,label,fontName='DocSans',fontSize=8))
def architecture():
 d=Drawing(480,240)
 box(d,10,158,135,65,'Postman','HTTP / JSON client')
 box(d,175,158,135,65,'Guards and DTOs','JWT, roles, validation')
 box(d,340,158,135,65,'Controllers','HTTP resource routes')
 box(d,340,35,135,65,'Services','Business rules / transactions')
 box(d,175,35,135,65,'TypeORM','Repository / EntityManager')
 box(d,10,35,135,65,'MySQL','Persistent InnoDB tables')
 for a in [(145,190,175,190),(310,190,340,190),(408,158,408,100),(340,68,310,68),(175,68,145,68)]:arrow(d,*a)
 d.add(String(10,9,'Response returns through the same application layers as JSON.',fontSize=9,fontName='DocSans'))
 return d
def erd():
 d=Drawing(495,450)
 box(d,20,350,135,80,'CUSTOMER','PK CustomerID\nEmail UNIQUE')
 box(d,345,350,130,80,'EMPLOYEE','PK EmployeeID\nRole Staff / Manager')
 box(d,20,205,135,90,'LOYALTY ACCOUNT','PK AccountID\nFK CustomerID UNIQUE\nPointsBalance, AccountStatus')
 box(d,175,205,145,90,'POINTS TRANSACTION','PK TransactionID\nFK AccountID, EmployeeID\nType, signed Points')
 box(d,350,205,125,90,'REWARD','PK RewardID\nPointsRequired\nStockQuantity, ReorderLevel')
 box(d,250,45,190,95,'REDEMPTION','PK RedemptionID\nFK TransactionID UNIQUE\nFK RewardID\nPending / Completed / Cancelled')
 box(d,20,45,180,95,'EMAIL NOTIFICATION','PK NotificationID\nFK CustomerID OR EmployeeID\nType, DeliveryStatus\nDateSent NULL until accepted')
 arrow(d,87,350,87,295);d.add(String(93,320,'1 : 1',fontName='DocSans',fontSize=8))
 arrow(d,155,250,175,250);d.add(String(153,304,'1 : many',fontName='DocSans',fontSize=7))
 arrow(d,370,350,275,295);d.add(String(280,330,'1 : many',fontName='DocSans',fontSize=8))
 arrow(d,245,205,295,140);d.add(String(228,177,'1 : 0..1',fontName='DocSans',fontSize=8))
 arrow(d,408,205,390,140);d.add(String(407,174,'1 : many',fontName='DocSans',fontSize=8))
 for x1,y1,x2,y2 in [(20,390,5,390),(5,390,5,100),(475,390,488,390),(488,390,488,20),(488,20,110,20)]:d.add(Line(x1,y1,x2,y2,strokeColor=colors.HexColor('#526a7b')))
 arrow(d,5,100,20,100);arrow(d,110,20,110,45)
 d.add(String(135,9,'Recipient links: one customer OR employee per notification',fontName='DocSans',fontSize=8))
 return d
lines=(P/'docs/Documentation.md').read_text().splitlines();story=[];i=0;first=True
while i<len(lines):
 l=lines[i]
 if not l.strip():i+=1;continue
 if l=='---':story.append(PageBreak());i+=1;continue
 if l.startswith('```'):
  code=[];i+=1
  while i<len(lines) and not lines[i].startswith('```'):
   # Wrap very long code as display text only.
   import textwrap
   code.extend(textwrap.wrap(lines[i],95,break_long_words=False,break_on_hyphens=False) or ['']);i+=1
  story.append(Preformatted('\n'.join(code),styles['CodeCustom']));i+=1;continue
 if l.startswith('|'):
  rows=[]
  while i<len(lines) and lines[i].startswith('|'):
   row=[x.strip() for x in lines[i].strip('|').split('|')]
   if not all(re.fullmatch(r'[-: ]+',x) for x in row):rows.append([para(x,'CellCustom') for x in row])
   i+=1
  n=len(rows[0]);widths={3:[100,172,208],4:[50,210,140,80]}.get(n,[480/n]*n)
  # Data dictionaries need a wider final column.
  if rows and n==3 and 'Table' in rows[0][0].getPlainText():widths=[85,95,300]
  if rows and n==3 and 'HTTP status' in rows[0][0].getPlainText():widths=[70,145,265]
  if rows and n==4 and 'Method' not in rows[0][0].getPlainText():widths=[50,145,160,125]
  table=Table(rows,colWidths=widths,repeatRows=1,hAlign='LEFT')
  table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#dcebec')),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f5f7fa')]),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#cbd5de')),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5)]));story.extend([table,Spacer(1,12)]);continue
 if l=='[ARCHITECTURE_DIAGRAM]':story.append(architecture());i+=1;continue
 if l=='[ERD_DIAGRAM]':story.append(erd());i+=1;continue
 if l.startswith('# '):
  if first:story.extend([Spacer(1,58),para(l[2:],'Title'),Spacer(1,22)]);first=False
  else:
   if story and not isinstance(story[-1],PageBreak):story.append(PageBreak())
   story.append(para(l[2:],'Heading1'))
  i+=1;continue
 if l.startswith('## '):story.append(para(l[3:],'Heading2'));i+=1;continue
 if re.match(r'^\d+\. ',l):story.append(para(l));i+=1;continue
 parts=[l];i+=1
 while i<len(lines) and lines[i].strip() and not lines[i].startswith(('#','|','```','[','---')) and not re.match(r'^\d+\. ',lines[i]):parts.append(lines[i]);i+=1
 story.append(para('\n'.join(x.rstrip() for x in parts) if any(x.endswith('  ') for x in parts) else ' '.join(parts)))
def page(c,doc):
 c.setStrokeColor(colors.HexColor('#cbd5de'));c.line(48,804,548,804)
 c.setFont('DocSans',8);c.setFillColor(colors.HexColor('#526a7b'))
 c.drawString(48,814,'ITEC 116 / Customer Loyalty and Rewards Management System')
 c.drawString(48,28,'Andrie Bacor | Backend Prototype | Documentation draft')
 c.drawRightString(548,28,str(doc.page))
SimpleDocTemplate(str(P/'docs/Documentation.pdf'),pagesize=(595.28,841.89),rightMargin=57,leftMargin=57,topMargin=55,bottomMargin=55,title='Customer Loyalty and Rewards Management System',author='Andrie Bacor').build(story,onFirstPage=page,onLaterPages=page)
print(P/'docs/Documentation.pdf')
