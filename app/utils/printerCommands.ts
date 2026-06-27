// ESC/POS command constants for thermal printers
export const FONTS = {
  NORMAL:        '\x1B\x21\x00',
  BOLD_ON:       '\x1B\x21\x08',
  BOLD_OFF:      '\x1B\x21\x00',
  DOUBLE_HEIGHT: '\x1B\x21\x10',
  ALIGN_LEFT:    '\x1B\x61\x00',
  ALIGN_CENTER:  '\x1B\x61\x01',
  ALIGN_RIGHT:   '\x1B\x61\x02',
};

export const PRINTER_COMMANDS = {
  INIT:        '\x1B\x40',
  CUT:         '\x1D\x56\x00',
  FEED_LINE:   '\x0A',
  FEED_LINES:  (n: number) => `\x1B\x64${String.fromCharCode(n)}`,
};

// QR Code ESC/POS command
export const buildQRCode = (data: string): string => {
  const str   = data.toString();
  const len   = str.length + 3;
  const pL    = len % 256;
  const pH    = Math.floor(len / 256);
  return (
    '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00' +  // model
    '\x1D\x28\x6B\x03\x00\x31\x43\x05'       +  // size 5
    '\x1D\x28\x6B\x03\x00\x31\x45\x49'       +  // error correction
    '\x1D\x28\x6B' + String.fromCharCode(pL) + String.fromCharCode(pH) +
    '\x31\x50\x30' + str                      +  // store data
    '\x1D\x28\x6B\x03\x00\x31\x51\x30'          // print
  );
};

// Format a left/right pair on one line (totalWidth chars wide)
export const formatLine = (
  left: string,
  right: string = '',
  totalWidth = 42,
): string => {
  const l = '  ' + left;
  if (!right) return FONTS.ALIGN_LEFT + l + '\n';
  const spaces = Math.max(1, totalWidth - l.length - right.length);
  return FONTS.ALIGN_LEFT + l + ' '.repeat(spaces) + right + '\n';
};

export const SEPARATOR = '-'.repeat(42) + '\n';
