/**
 * downloadFile — saves a file directly to the device's Downloads folder.
 *
 * Android : writes to /storage/emulated/0/Download/ (no dialog, silent save).
 *           Requires WRITE_EXTERNAL_STORAGE in app.json → android.permissions.
 * iOS     : opens the standard "Save to Files" share sheet (iOS has no Downloads folder).
 */

import { Platform, Alert } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const FS = require('expo-file-system/legacy');

type Options = {
  fileName: string;         // e.g. "Estimation_T001.doc"
  content: string;          // text / HTML content
  mimeType: string;         // e.g. "application/msword"
  encoding?: 'utf8' | 'base64';
};

export async function downloadFile({ fileName, content, mimeType, encoding = 'utf8' }: Options) {
  const enc = encoding === 'base64' ? FS.EncodingType.Base64 : FS.EncodingType.UTF8;

  if (Platform.OS === 'android') {
    // Direct write to Downloads folder — no dialog
    const dest = `${FS.StorageAccessFramework
      ? 'file:///storage/emulated/0/Download/'
      : FS.documentDirectory}${fileName}`;

    try {
      await FS.writeAsStringAsync(dest, content, { encoding: enc });
      Alert.alert('Downloaded', `${fileName} saved to Downloads.`);
    } catch (e: any) {
      // Fallback: SAF folder-picker if direct write is blocked (Android 11+ strict mode)
      try {
        const perms = await FS.StorageAccessFramework.requestDirectoryPermissionsAsync(
          'content://com.android.externalstorage.documents/tree/primary%3ADownload',
        );
        if (!perms.granted) return;
        const fileUri = await FS.StorageAccessFramework.createFileAsync(
          perms.directoryUri,
          fileName,
          mimeType,
        );
        await FS.writeAsStringAsync(fileUri, content, { encoding: enc });
        Alert.alert('Downloaded', `${fileName} saved to Downloads.`);
      } catch (e2: any) {
        Alert.alert('Error', e2?.message || 'Could not save file');
      }
    }
  } else {
    // iOS: write to documentDirectory then open share sheet → Save to Files
    const dest = `${FS.documentDirectory}${fileName}`;
    await FS.writeAsStringAsync(dest, content, { encoding: enc });
    const Sharing = require('expo-sharing');
    await Sharing.shareAsync(dest, { mimeType, dialogTitle: `Save ${fileName}` });
  }
}
