/**
 * ExportButtons — PDF, Word, and Print export for any HTML content string.
 *
 * ─── SETUP (run once in your project root) ─────────────────────────────────
 *   npx expo install expo-print expo-sharing expo-file-system
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   <ExportButtons
 *     htmlContent={myHtmlString}
 *     fileName="Estimate_001"
 *   />
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Spacing, Radius } from './theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExportButtonsProps {
  /** Full HTML string to export/print */
  htmlContent: string;
  /** Base file name without extension */
  fileName?: string;
  showPdf?: boolean;
  showWord?: boolean;
  showPrint?: boolean;
  /** Extra container style */
  style?: ViewStyle;
}

type ExportKind = 'pdf' | 'word' | 'print';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Wraps bare body HTML in a minimal, print-styled document. */
const wrapHtml = (body: string, title = 'Document') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1A2332; margin: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th    { background: #1565C0; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td    { padding: 7px 10px; border-bottom: 1px solid #E0E6ED; }
    tr:nth-child(even) td { background: #F5F7FA; }
    h1, h2, h3 { color: #1565C0; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${body}</body>
</html>`;

// ─── Component ───────────────────────────────────────────────────────────────

const ExportButtons: React.FC<ExportButtonsProps> = ({
  htmlContent,
  fileName = 'Export',
  showPdf   = true,
  showWord  = true,
  showPrint = true,
  style,
}) => {
  const [busy, setBusy] = useState<ExportKind | null>(null);

  const fullHtml = wrapHtml(htmlContent, fileName);

  const handleExport = async (kind: ExportKind) => {
    setBusy(kind);
    try {
      // Dynamically require so the app doesn't crash if libs aren't installed yet.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Print   = require('expo-print');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sharing = require('expo-sharing');

      if (kind === 'print') {
        await Print.printAsync({ html: fullHtml });
        return;
      }

      if (kind === 'pdf') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const FS = require('expo-file-system/legacy');
        // printToFileAsync writes to expo's internal print sandbox which
        // expo-sharing cannot read directly on Android (Expo Go).
        // Workaround: read the bytes as base64, write them to cacheDirectory
        // (same location Word export uses — confirmed accessible), then share.
        const { uri } = await Print.printToFileAsync({ html: fullHtml });
        const base64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
        const dest = `${FS.cacheDirectory}${fileName}.pdf`;
        await FS.writeAsStringAsync(dest, base64, { encoding: FS.EncodingType.Base64 });
        await Sharing.shareAsync(dest, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${fileName}.pdf`,
          UTI: 'com.adobe.pdf',
        });
        return;
      }

      if (kind === 'word') {
        // Write HTML as a .doc file (Word opens it natively) using the new FS API.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const FS = require('expo-file-system/legacy');
        const dest = `${FS.cacheDirectory}${fileName}.doc`;
        await FS.writeAsStringAsync(dest, fullHtml, { encoding: FS.EncodingType.UTF8 });
        await Sharing.shareAsync(dest, {
          mimeType: 'application/msword',
          dialogTitle: `Share ${fileName}.doc`,
          UTI: 'com.microsoft.word.doc',
        });
      }
    } catch (err: any) {
      const isNotInstalled =
        err?.message?.includes("Cannot find module") ||
        err?.message?.includes("Unable to resolve");

      Alert.alert(
        isNotInstalled ? 'Libraries not installed' : 'Export failed',
        isNotInstalled
          ? 'Run the following command in your project root:\n\nnpx expo install expo-print expo-sharing expo-file-system'
          : err?.message ?? 'Unknown error',
      );
    } finally {
      setBusy(null);
    }
  };

  const buttons: { kind: ExportKind; label: string; show: boolean; color: string }[] = [
    { kind: 'pdf',   label: '⬇ PDF',   show: showPdf,   color: Colors.error   },
    { kind: 'word',  label: '⬇ Word',  show: showWord,  color: Colors.primary },
    { kind: 'print', label: '⎙ Print', show: showPrint, color: Colors.success },
  ];

  return (
    <View style={[styles.row, style]}>
      {buttons
        .filter(b => b.show)
        .map(b => (
          <TouchableOpacity
            key={b.kind}
            style={[styles.btn, { borderColor: b.color }, busy === b.kind && styles.btnBusy]}
            onPress={() => handleExport(b.kind)}
            disabled={busy !== null}
            activeOpacity={0.75}
          >
            {busy === b.kind ? (
              <ActivityIndicator size="small" color={b.color} />
            ) : (
              <Text style={[styles.btnText, { color: b.color }]}>{b.label}</Text>
            )}
          </TouchableOpacity>
        ))}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    backgroundColor: Colors.white,
    minWidth: 90,
    justifyContent: 'center',
  },
  btnBusy: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: Typography.fontSizeSM,
    fontWeight: Typography.fontWeightSemiBold,
  },
});

export default ExportButtons;
