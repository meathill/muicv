export type PreviewTabs = {
  paths: readonly string[];
  activePath: string | null;
  isOpen: boolean;
};

export const EMPTY_PREVIEW_TABS: PreviewTabs = { paths: [], activePath: null, isOpen: false };

export function openPreviewTab(tabs: PreviewTabs, path: string): PreviewTabs {
  return {
    paths: tabs.paths.includes(path) ? tabs.paths : [...tabs.paths, path],
    activePath: path,
    isOpen: true,
  };
}

export function closePreviewTab(tabs: PreviewTabs, path: string): PreviewTabs {
  const index = tabs.paths.indexOf(path);
  if (index === -1) return tabs;

  const paths = tabs.paths.filter((entry) => entry !== path);
  if (paths.length === 0) return EMPTY_PREVIEW_TABS;

  const activePath = tabs.activePath === path ? (paths[index] ?? paths[index - 1] ?? null) : tabs.activePath;
  return { ...tabs, paths, activePath };
}
