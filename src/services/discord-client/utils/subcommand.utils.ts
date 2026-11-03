const FILE_EXTENSION_REGEX = /\.(?:[cm]?[jt]s)$/i;

const normalizeName = (value: string): string => value.trim().toLowerCase();

const stripExtension = (fileName: string): string => fileName.replace(FILE_EXTENSION_REGEX, '');

const splitSegments = (fileName: string): string[] => stripExtension(fileName).split('.');

export const isSubCommandFile = (fileName: string): boolean => splitSegments(fileName).length > 1;

export const extractCommandFileMeta = (
  fileName: string
): { parentSegment: string; subCommandSegment?: string } => {
  const segments = splitSegments(fileName);
  const [parentSegment, ...rest] = segments;

  return {
    parentSegment: parentSegment ?? '',
    subCommandSegment: rest.length ? rest.join('.') : undefined,
  };
};

export const buildSubCommandKey = (parentName: string, subCommandName: string): string =>
  `${normalizeName(parentName)}:${normalizeName(subCommandName)}`;
