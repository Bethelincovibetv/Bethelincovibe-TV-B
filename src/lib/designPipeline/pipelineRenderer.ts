import {
  PipelineBriefInput,
  ParsedBrief,
  GraphicDesignFormatKey,
  GraphicDimension,
  LayoutArchetypeKey,
} from "./types";
import { parseDesignBrief } from "./contentParser";
import { resolveBestStockPhoto } from "./stockPhotoService";
import { FONT_PAIRINGS, calculateOptimalFontSize, wrapCanvasText } from "./typographyEngine";
import { COLOR_THEMES, drawRoundRect, renderBackdropDecorations } from "./backgroundEngine";
import { loadCanvasImage, renderMaskedSubjectImage, drawFocalImage } from "./imageCompositor";

export const PIPELINE_GRAPHIC_FORMATS: GraphicDimension[] = [
  {
    key: "business_flyer",
    label: "Business Flyer (4:5)",
    category: "business",
    width: 1080,
    height: 1350,
    aspect: "4:5",
    description: "High-impact portrait flyer for WhatsApp distribution & direct client outreach",
    iconName: "FileText",
  },
  {
    key: "instagram_post",
    label: "Instagram / Square Post (1:1)",
    category: "social",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    description: "Perfect square post for Instagram, Facebook & Twitter feeds",
    iconName: "Instagram",
  },
  {
    key: "whatsapp_status",
    label: "WhatsApp Status / Story (9:16)",
    category: "social",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    description: "Full-screen vertical story for WhatsApp Status, TikTok & Reels",
    iconName: "Smartphone",
  },
  {
    key: "a4_print_flyer",
    label: "A4 Print Flyer (High-Res 300DPI)",
    category: "print",
    width: 1240,
    height: 1754,
    aspect: "1:1.414",
    description: "Commercial print-ready A4 handbill for physical printing & distribution",
    iconName: "Printer",
    isPrintReady: true,
  },
  {
    key: "display_banner",
    label: "Commercial Display Banner (1.91:1)",
    category: "business",
    width: 1200,
    height: 630,
    aspect: "1.91:1",
    description: "Wide landscape banner for directory listings, web headers & Facebook ads",
    iconName: "LayoutTemplate",
  },
  {
    key: "product_promo",
    label: "Product Showcase Card (1:1)",
    category: "promo",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    description: "Showcase physical items with Naira price callout, in-stock badge & CTA",
    iconName: "ShoppingBag",
  },
  {
    key: "discount_sale",
    label: "Flash Sale & Promo (1:1)",
    category: "promo",
    width: 1080,
    height: 1080,
    aspect: "1:1",
    description: "High-urgency promotional creative with large discount callout",
    iconName: "Tag",
  },
  {
    key: "event_flyer",
    label: "Event & Seminar Flyer (4:5)",
    category: "events",
    width: 1080,
    height: 1350,
    aspect: "4:5",
    description: "Announcement for seminars, conferences, church programs & masterclasses",
    iconName: "Calendar",
  },
  {
    key: "youtube_thumbnail",
    label: "YouTube / Video Cover (16:9)",
    category: "social",
    width: 1280,
    height: 720,
    aspect: "16:9",
    description: "Click-worthy video cover with bold display typography",
    iconName: "PlaySquare",
  },
  {
    key: "business_card",
    label: "Digital Business Card (1.75:1)",
    category: "business",
    width: 1050,
    height: 600,
    aspect: "1.75:1",
    description: "Executive digital card with QR placeholder & business details",
    iconName: "CreditCard",
  },
];

/**
 * Master Pipeline Renderer: Executes all 6 stages of commercial graphic design
 */
export async function executeDesignPipeline(
  input: PipelineBriefInput
): Promise<{ dataUrl: string; brief: ParsedBrief }> {
  // STAGE 1: Content/Brief Parser & Semantic Analyzer
  const brief = parseDesignBrief(input);

  const format =
    PIPELINE_GRAPHIC_FORMATS.find((f) => f.key === input.formatKey) ||
    PIPELINE_GRAPHIC_FORMATS[0];

  const scale = input.exportScale || 1;
  const width = (input.customWidth || format.width) * scale;
  const height = (input.customHeight || format.height) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context");
  }

  // STAGE 2: Layout Grid Selection & Theme Resolution
  const theme = COLOR_THEMES[brief.themeStyle];
  const fontConfig = FONT_PAIRINGS[brief.fontPairing];
  const isLandscape = width > height;
  const isTall = height > width * 1.35;

  // STAGE 3: Multi-Source Stock Image Resolution & Pre-Loading
  const stockAsset =
    input.stockAsset ||
    resolveBestStockPhoto(input.category, brief.cleanHeadline, input.stockImageUrl);

  const [bgStockImg, subjectImg, logoImg] = await Promise.all([
    loadCanvasImage(stockAsset.url),
    loadCanvasImage(stockAsset.url),
    input.logoUrl ? loadCanvasImage(input.logoUrl) : Promise.resolve(null),
  ]);

  // STAGE 4: Background Construction & Contrast Treatments
  // 4a. Ambient Stock Blur Backdrop
  if (bgStockImg) {
    ctx.save();
    ctx.filter = "blur(18px) brightness(0.4)";
    drawFocalImage(ctx, bgStockImg, -20, -20, width + 40, height + 40, stockAsset.focalPoint.x, stockAsset.focalPoint.y);
    ctx.restore();
  } else {
    ctx.fillStyle = "#0A0F1D";
    ctx.fillRect(0, 0, width, height);
  }

  // 4b. Darkroom Gradient Wash
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, theme.bgGradientFrom);
  bgGrad.addColorStop(0.5, theme.bgGradientVia);
  bgGrad.addColorStop(1, theme.bgGradientTo);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 4c. Geometric Backdrop Elements & Corner Insets
  renderBackdropDecorations(ctx, width, height, theme);

  // STAGE 5: Layout Archetype Composition & Subject Placement
  await renderArchetypeComposition(
    ctx,
    width,
    height,
    brief,
    theme,
    fontConfig,
    subjectImg,
    stockAsset.focalPoint,
    logoImg,
    input.businessName,
    input.tagline,
    isLandscape,
    isTall
  );

  return {
    dataUrl: canvas.toDataURL("image/png"),
    brief,
  };
}

/**
 * Composites the specific layout archetype with optical balance & typographic hierarchy
 */
async function renderArchetypeComposition(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brief: ParsedBrief,
  theme: any,
  fontConfig: any,
  subjectImg: HTMLImageElement | null,
  focalPoint: { x: number; y: number },
  logoImg: HTMLImageElement | null,
  businessName: string,
  tagline?: string,
  isLandscape: boolean = false,
  isTall: boolean = false
) {
  const padX = Math.max(36, Math.round(width * 0.05));
  let curY = Math.max(42, Math.round(height * 0.04));

  // --- 1. TOP ANNOUNCEMENT BADGE ---
  ctx.save();
  ctx.font = `800 ${Math.max(12, Math.round(width * 0.0125))}px ${fontConfig.bodyFont}`;
  const badgeText = brief.cleanBadgeText.toUpperCase();
  const badgeW = ctx.measureText(badgeText).width + 36;
  const badgeH = 34;
  const badgeX = isLandscape ? padX : (width - badgeW) / 2;

  ctx.fillStyle = theme.badgeBg;
  drawRoundRect(ctx, badgeX, curY, badgeW, badgeH, 17);
  ctx.fill();

  ctx.fillStyle = theme.badgeTextColor;
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeW / 2, curY + 22);
  ctx.restore();

  // Price Tag in top header if space permits
  if (brief.cleanPriceTag && isLandscape) {
    ctx.save();
    ctx.font = `900 ${Math.max(14, Math.round(width * 0.014))}px ${fontConfig.bodyFont}`;
    const pW = ctx.measureText(brief.cleanPriceTag).width + 32;
    const pX = width - padX - pW;
    ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
    drawRoundRect(ctx, pX, curY, pW, 34, 17);
    ctx.fill();
    ctx.strokeStyle = "#22C55E";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#4ADE80";
    ctx.textAlign = "center";
    ctx.fillText(brief.cleanPriceTag, pX + pW / 2, curY + 22);
    ctx.restore();
  }

  curY += 46;

  // --- 2. BUSINESS BRANDING BAR ---
  ctx.save();
  const logoSize = Math.max(48, Math.round(width * 0.055));
  const brandCenterX = isLandscape ? padX : width / 2;

  if (logoImg) {
    const lx = isLandscape ? padX : width / 2 - logoSize / 2;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(lx + logoSize / 2, curY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(lx + logoSize / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logoImg, lx, curY, logoSize, logoSize);
    ctx.restore();

    ctx.strokeStyle = theme.primaryAccent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx + logoSize / 2, curY + logoSize / 2, logoSize / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();

    curY += logoSize + 12;
  }

  // Business Name
  ctx.font = `800 ${Math.max(18, Math.round(width * 0.022))}px ${fontConfig.bodyFont}`;
  ctx.fillStyle = theme.secondaryAccent;
  ctx.textAlign = isLandscape ? "left" : "center";
  ctx.fillText((businessName || "BETHELIN COVIBE").toUpperCase(), brandCenterX, curY);

  if (tagline) {
    curY += 20;
    ctx.font = `600 ${Math.max(11, Math.round(width * 0.011))}px ${fontConfig.bodyFont}`;
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(tagline.toUpperCase(), brandCenterX, curY);
  }
  ctx.restore();

  curY += Math.max(28, Math.round(height * 0.025));

  // --- 3. DYNAMIC SUBJECT PHOTO & HEADLINE LAYOUT ---
  if (isLandscape) {
    // Landscape 2-Column Split
    const colW = (width - padX * 2 - 32) / 2;

    // Left Column: Text & Features
    let leftY = curY;

    // Headline
    ctx.save();
    const { fontSize, lines } = calculateOptimalFontSize(
      ctx,
      brief.cleanHeadline,
      fontConfig.displayFont,
      fontConfig.headlineWeight,
      fontConfig.headlineStyle,
      colW,
      140,
      Math.round(width * 0.038),
      22
    );

    ctx.font = `${fontConfig.headlineStyle === "italic" ? "italic " : ""}${fontConfig.headlineWeight} ${fontSize}px ${fontConfig.displayFont}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 12;

    for (const l of lines) {
      ctx.fillText(l, padX, leftY + fontSize);
      leftY += fontSize * 1.15;
    }
    ctx.restore();

    // Subheadline
    if (brief.cleanSubheadline) {
      leftY += 10;
      ctx.save();
      const subSize = Math.max(13, Math.round(width * 0.013));
      ctx.font = `normal ${subSize}px ${fontConfig.bodyFont}`;
      ctx.fillStyle = "#CBD5E1";
      ctx.textAlign = "left";
      const subLines = wrapCanvasText(ctx, brief.cleanSubheadline, colW, 2);
      for (const sl of subLines) {
        ctx.fillText(sl, padX, leftY + subSize);
        leftY += subSize * 1.35;
      }
      ctx.restore();
    }

    // Right Column: Subject Photo Mask
    if (subjectImg) {
      const photoX = width - padX - colW;
      const photoH = height - curY - 140;
      renderMaskedSubjectImage(
        ctx,
        subjectImg,
        brief.maskShape,
        { x: photoX, y: curY, width: colW, height: photoH },
        focalPoint,
        theme.borderColor,
        theme.ambientLightColor
      );
    }
  } else {
    // Portrait / Square Layout

    // Headline Area
    ctx.save();
    const maxHeadlineW = width - padX * 2;
    const { fontSize, lines } = calculateOptimalFontSize(
      ctx,
      brief.cleanHeadline,
      fontConfig.displayFont,
      fontConfig.headlineWeight,
      fontConfig.headlineStyle,
      maxHeadlineW,
      130,
      Math.max(34, Math.round(width * 0.046)),
      24
    );

    ctx.font = `${fontConfig.headlineStyle === "italic" ? "italic " : ""}${fontConfig.headlineWeight} ${fontSize}px ${fontConfig.displayFont}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 14;

    for (const line of lines) {
      ctx.fillText(line, width / 2, curY);
      curY += fontSize * 1.15;
    }
    ctx.restore();

    // Subheadline
    if (brief.cleanSubheadline) {
      ctx.save();
      const subSize = Math.max(14, Math.round(width * 0.017));
      ctx.font = `500 ${subSize}px ${fontConfig.bodyFont}`;
      ctx.fillStyle = "#E2E8F0";
      ctx.textAlign = "center";
      const subLines = wrapCanvasText(ctx, brief.cleanSubheadline, maxHeadlineW * 0.9, 2);
      for (const sl of subLines) {
        ctx.fillText(sl, width / 2, curY);
        curY += subSize * 1.35;
      }
      ctx.restore();
    }

    curY += Math.max(16, Math.round(height * 0.015));

    // Middle Hero Subject Photo
    if (subjectImg) {
      const photoW = Math.min(width - padX * 2, isTall ? width * 0.85 : width * 0.72);
      const photoH = isTall ? height * 0.34 : isLandscape ? height * 0.4 : height * 0.28;
      const photoX = (width - photoW) / 2;

      renderMaskedSubjectImage(
        ctx,
        subjectImg,
        brief.maskShape,
        { x: photoX, y: curY, width: photoW, height: photoH },
        focalPoint,
        theme.borderColor,
        theme.ambientLightColor
      );

      // Price Tag floating badge on corner of photo
      if (brief.cleanPriceTag) {
        ctx.save();
        ctx.font = `900 ${Math.max(16, Math.round(width * 0.02))}px ${fontConfig.bodyFont}`;
        const pText = brief.cleanPriceTag;
        const pW = ctx.measureText(pText).width + 36;
        const pH = 42;
        const pX = photoX + photoW - pW - 12;
        const pY = curY + photoH - pH - 12;

        ctx.fillStyle = "#22C55E";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 16;
        drawRoundRect(ctx, pX, pY, pW, pH, 21);
        ctx.fill();

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.fillText(pText, pX + pW / 2, pY + 27);
        ctx.restore();
      }

      curY += photoH + Math.max(18, Math.round(height * 0.02));
    }
  }

  // --- 4. VALUE HIGHLIGHTS CONTAINER ---
  const highlights = brief.formattedHighlights.slice(0, isTall ? 4 : 3);
  if (highlights.length > 0 && curY < height - 220) {
    ctx.save();
    const boxW = Math.min(width - padX * 2, 780);
    const boxH = highlights.length * 36 + 20;
    const boxX = (width - boxW) / 2;

    ctx.fillStyle = theme.cardBg;
    drawRoundRect(ctx, boxX, curY, boxW, boxH, 16);
    ctx.fill();

    ctx.strokeStyle = theme.cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    let hlY = curY + 28;
    for (const hl of highlights) {
      ctx.font = `700 ${Math.max(14, Math.round(width * 0.016))}px ${fontConfig.bodyFont}`;
      ctx.fillStyle = theme.highlightText;
      ctx.textAlign = "left";
      ctx.fillText(`✓  ${hl}`, boxX + 24, hlY);
      hlY += 34;
    }
    ctx.restore();
  }

  // --- 5. BOTTOM HIGH-CONVERTING CONTACT & CTA BAR ---
  const botBoxH = Math.max(130, Math.round(height * 0.16));
  const botBoxY = height - botBoxH - Math.max(20, Math.round(height * 0.02));
  const botBoxW = width - padX * 2;
  const botBoxX = padX;

  ctx.save();
  ctx.fillStyle = "rgba(10, 16, 30, 0.96)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 24;
  drawRoundRect(ctx, botBoxX, botBoxY, botBoxW, botBoxH, 18);
  ctx.fill();

  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Contact Details
  let contactY = botBoxY + 30;
  ctx.font = `800 ${Math.max(14, Math.round(width * 0.016))}px ${fontConfig.bodyFont}`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(`📞 CALL: ${brief.formattedPhone}`, width / 2, contactY);

  if (brief.formattedWhatsapp) {
    contactY += 26;
    ctx.fillStyle = "#22C55E";
    ctx.fillText(`💬 WHATSAPP: ${brief.formattedWhatsapp}`, width / 2, contactY);
  }

  // CTA Button Inside Bar
  const ctaBtnW = Math.min(360, botBoxW - 40);
  const ctaBtnH = 42;
  const ctaBtnX = (width - ctaBtnW) / 2;
  const ctaBtnY = botBoxY + botBoxH - ctaBtnH - 12;

  ctx.fillStyle = theme.ctaBg;
  drawRoundRect(ctx, ctaBtnX, ctaBtnY, ctaBtnW, ctaBtnH, 21);
  ctx.fill();

  ctx.fillStyle = theme.ctaTextColor;
  ctx.font = `900 ${Math.max(14, Math.round(width * 0.015))}px ${fontConfig.bodyFont}`;
  ctx.textAlign = "center";
  ctx.fillText(brief.cleanCtaText, width / 2, ctaBtnY + 26);
  ctx.restore();
}
