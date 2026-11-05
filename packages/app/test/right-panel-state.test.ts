import assert from 'node:assert/strict';
import test from 'node:test';

import { closePreviewTab, EMPTY_PREVIEW_TABS, openPreviewTab } from '../src/renderer/lib/preview-tabs.ts';
import { useAppStore } from '../src/renderer/lib/store.ts';

test('openPreviewTab: 连续打开多个文件，保持标签列表并激活最新文件', () => {
  let tabs = EMPTY_PREVIEW_TABS;
  tabs = openPreviewTab(tabs, '/workspace/plan.md');
  assert.equal(tabs.activePath, '/workspace/plan.md');
  assert.deepEqual(tabs.paths, ['/workspace/plan.md']);
  assert.equal(tabs.isOpen, true);

  // 批量修改写入第二个文件
  tabs = openPreviewTab(tabs, '/workspace/resume.json');
  assert.equal(tabs.activePath, '/workspace/resume.json');
  assert.deepEqual(tabs.paths, ['/workspace/plan.md', '/workspace/resume.json']);
});

test('closePreviewTab: 关闭当前选中项后激活相邻项，关完后重置为空', () => {
  let tabs = EMPTY_PREVIEW_TABS;
  tabs = openPreviewTab(tabs, '/a.md');
  tabs = openPreviewTab(tabs, '/b.md');
  tabs = openPreviewTab(tabs, '/c.md');

  // 关闭中间的 /b.md（非当前激活项 /c.md）
  tabs = closePreviewTab(tabs, '/b.md');
  assert.equal(tabs.activePath, '/c.md');
  assert.deepEqual(tabs.paths, ['/a.md', '/c.md']);

  // 关闭当前激活项 /c.md，应切回 /a.md
  tabs = closePreviewTab(tabs, '/c.md');
  assert.equal(tabs.activePath, '/a.md');
  assert.deepEqual(tabs.paths, ['/a.md']);

  // 关闭最后一项
  tabs = closePreviewTab(tabs, '/a.md');
  assert.deepEqual(tabs, EMPTY_PREVIEW_TABS);
});

test('useAppStore: openRightPanel 展开右栏分栏并保持打开，不触发全屏遮罩抽屉', () => {
  useAppStore.setState({
    rightCollapsed: true,
    rightPanelView: 'tree',
    previewDrawerOpen: true,
    previewTabs: EMPTY_PREVIEW_TABS,
  });

  useAppStore.getState().openRightPanel('/workspace/target.md');

  const state = useAppStore.getState();
  assert.equal(state.rightCollapsed, false, '右栏应展开');
  assert.equal(state.rightPanelView, 'preview', '视图应切换至 preview');
  assert.equal(state.previewDrawerOpen, false, '不应打开全屏遮罩抽屉');
  assert.equal(state.previewTabs.activePath, '/workspace/target.md');
  assert.deepEqual(state.previewTabs.paths, ['/workspace/target.md']);
});

test('useAppStore: 批量修改生成多个工件，保持右栏打开并累加标签', () => {
  useAppStore.setState({
    rightCollapsed: true,
    previewDrawerOpen: false,
    previewTabs: EMPTY_PREVIEW_TABS,
  });

  // 第一步生成 plan.md
  useAppStore.getState().openRightPanel('/workspace/plan.md');
  assert.equal(useAppStore.getState().rightCollapsed, false);
  assert.equal(useAppStore.getState().previewTabs.activePath, '/workspace/plan.md');

  // 第二步生成 resume.json
  useAppStore.getState().openRightPanel('/workspace/resume.json');
  assert.equal(useAppStore.getState().rightCollapsed, false, '右栏保持打开');
  assert.equal(useAppStore.getState().previewDrawerOpen, false, '依然不弹全屏抽屉');
  assert.equal(useAppStore.getState().previewTabs.activePath, '/workspace/resume.json');
  assert.deepEqual(useAppStore.getState().previewTabs.paths, ['/workspace/plan.md', '/workspace/resume.json']);
});

test('useAppStore: closePreviewTab 关掉最后一个标签时若无文件树则自动收起右栏', () => {
  useAppStore.setState({
    rightCollapsed: false,
    rightPanelTreeRoot: null,
    rightPanelView: 'preview',
    previewTabs: { paths: ['/a.md'], activePath: '/a.md', isOpen: true },
  });

  useAppStore.getState().closePreviewTab('/a.md');

  const state = useAppStore.getState();
  assert.equal(state.rightCollapsed, true, '无剩余标签且无文件树时应自动收起右栏');
  assert.deepEqual(state.previewTabs.paths, []);
});

test('useAppStore: closePreviewTab 关掉最后一个标签时若有文件树则切到文件树', () => {
  useAppStore.setState({
    rightCollapsed: false,
    rightPanelTreeRoot: '/my-workspace',
    rightPanelView: 'preview',
    previewTabs: { paths: ['/a.md'], activePath: '/a.md', isOpen: true },
  });

  useAppStore.getState().closePreviewTab('/a.md');

  const state = useAppStore.getState();
  assert.equal(state.rightCollapsed, false, '有文件树时保持右栏展开');
  assert.equal(state.rightPanelView, 'tree', '自动切到文件树');
});

test('useAppStore: 临时抽屉预览与退出不破坏分栏状态', () => {
  useAppStore.setState({
    rightCollapsed: false,
    previewDrawerOpen: false,
    previewTabs: { paths: ['/a.md'], activePath: '/a.md', isOpen: true },
  });

  // 用户点击临时全屏抽屉预览
  useAppStore.getState().openDrawerPreview();
  assert.equal(useAppStore.getState().previewDrawerOpen, true);
  assert.equal(useAppStore.getState().rightCollapsed, false);

  // 用户关闭临时抽屉（如 ESC / 点遮罩 / 点收起抽屉）
  useAppStore.getState().closeDrawerPreview();
  assert.equal(useAppStore.getState().previewDrawerOpen, false);
  assert.equal(useAppStore.getState().rightCollapsed, false, '分栏依然保持打开');
  assert.equal(useAppStore.getState().previewTabs.activePath, '/a.md');
});

test('useAppStore: closeRightPanel 收起右栏且同时关闭可能存在的临时抽屉', () => {
  useAppStore.setState({
    rightCollapsed: false,
    previewDrawerOpen: true,
  });

  useAppStore.getState().closeRightPanel();
  assert.equal(useAppStore.getState().rightCollapsed, true);
  assert.equal(useAppStore.getState().previewDrawerOpen, false);
});
