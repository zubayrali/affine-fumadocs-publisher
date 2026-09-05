import assert from 'node:assert/strict';
import test from 'node:test';
import { affineCanvasToCanvasData } from '../src/canvas/adapter.ts';
import { parseCanvasData } from '../src/canvas/load-canvas.ts';
import { nodeLabel } from '../src/canvas/labels.ts';
import { resolveCanvasColor } from '../src/canvas/colors.ts';

test('maps structured notes, frames, shapes, groups, text, and connectors', () => {
  const canvas = affineCanvasToCanvasData({
    exists: true,
    edgelessBlocks: [
      {
        id: 'frame',
        flavour: 'affine:frame',
        title: 'Topic map',
        bounds: { x: 0, y: 0, width: 700, height: 500 },
      },
      {
        id: 'note',
        flavour: 'affine:note',
        bounds: { x: 50, y: 70, width: 260, height: 180 },
        text: 'flat fallback',
        background: { light: '#ffffff', dark: '#000000' },
        children: [
          { type: 'h2', text: 'Overview' },
          { type: 'text', text: 'Daily practice' },
          { type: 'todo', text: 'Read the guide', checked: true },
        ],
      },
    ],
    surfaceElements: [
      {
        id: 'shape',
        type: 'shape',
        shapeType: 'diamond',
        text: 'Intention',
        fillColor: '--affine-palette-shape-yellow',
        strokeColor: '#a16207',
        color: '#111827',
        fontSize: 18,
        bounds: { x: 400, y: 100, width: 180, height: 100 },
      },
      {
        id: 'label',
        type: 'text',
        text: 'Begin here',
        color: '#111827',
        bounds: { x: 400, y: 260, width: 160, height: 40 },
      },
      {
        id: 'surface-group',
        type: 'group',
        title: 'Sequence',
        bounds: { x: 350, y: 50, width: 280, height: 300 },
      },
      {
        id: 'edge',
        type: 'connector',
        source: { id: 'note', position: [1, 0.5] },
        target: { id: 'shape', position: [0, 0.5] },
        frontEndpointStyle: 'None',
        rearEndpointStyle: 'Arrow',
        mode: 1,
        strokeStyle: 'dash',
        strokeWidth: 4,
        stroke: '#929292',
        label: 'leads to',
      },
    ],
  });

  assert.equal(canvas.nodes.length, 5);
  assert.deepEqual(
    canvas.nodes.find((node) => node.id === 'note'),
    {
      id: 'note',
      x: 50,
      y: 70,
      width: 260,
      height: 180,
      type: 'text',
      text: '## Overview\n\nDaily practice\n\n- [x] Read the guide',
      content: [
        { type: 'markdown', text: '## Overview\n\nDaily practice\n\n- [x] Read the guide' },
      ],
      color: { light: '#ffffff', dark: '#000000' },
    },
  );
  const shape = canvas.nodes.find((node) => node.id === 'shape');
  assert.equal(shape?.type, 'shape');
  if (shape?.type === 'shape') {
    assert.equal(shape.shape, 'diamond');
    assert.equal(shape.fillColor, '#fcd34d');
    assert.equal(shape.text, 'Intention');
  }
  const label = canvas.nodes.find((node) => node.id === 'label');
  assert.equal(label?.type, 'text');
  if (label?.type === 'text') {
    assert.equal(label.variant, 'label');
    assert.equal(label.text, 'Begin here');
    assert.equal(label.textAlign, 'center');
    assert.deepEqual(label.color, { light: '#111827', dark: '#f8fafc' });
  }
  assert.equal(canvas.edges.length, 1);
  assert.partialDeepStrictEqual(canvas.edges[0], {
    id: 'edge',
    fromNode: 'note',
    toNode: 'shape',
    fromSide: 'right',
    toSide: 'left',
    fromPosition: [1, 0.5],
    toPosition: [0, 0.5],
    mode: 'orthogonal',
    strokeStyle: 'dash',
    strokeWidth: 4,
    fromEnd: 'none',
    toEnd: 'arrow',
    label: 'leads to',
  });
});

test('drops unbound connectors and malformed elements', () => {
  const canvas = affineCanvasToCanvasData({
    edgelessBlocks: [{ id: 'bad', flavour: 'affine:note', bounds: null }],
    surfaceElements: [{ id: 'edge', type: 'connector', source: { id: 'missing' } }],
  });
  assert.deepEqual(canvas, { nodes: [], edges: [] });
});

test('maps a standalone AFFiNE surface image to a positioned canvas file node', () => {
  const canvas = affineCanvasToCanvasData({
    edgelessBlocks: [
      {
        id: 'image',
        flavour: 'affine:image',
        bounds: { x: 80, y: 120, width: 640, height: 360 },
        sourceId: 'blob-key',
        caption: 'Canvas-only image',
      },
    ],
  });

  assert.deepEqual(canvas.nodes, [
    {
      id: 'image',
      type: 'file',
      file: 'affine://blob/blob-key',
      x: 80,
      y: 120,
      width: 640,
      height: 360,
    },
  ]);
});

test('round-trips native shape fields through the public canvas parser', () => {
  const parsed = parseCanvasData(
    JSON.stringify({
      nodes: [
        {
          id: 'shape',
          type: 'shape',
          shape: 'ellipse',
          x: 1,
          y: 2,
          width: 100,
          height: 60,
          text: 'Circle',
          fillColor: '#fff',
          strokeColor: '#000',
          rotate: 15,
        },
      ],
      edges: [],
    }),
  );
  assert.partialDeepStrictEqual(parsed.nodes[0], {
    id: 'shape',
    type: 'shape',
    shape: 'ellipse',
    text: 'Circle',
    rotate: 15,
  });
});

test('publishes rich AFFiNE blocks and strips publication YAML', () => {
  const canvas = affineCanvasToCanvasData({
    edgelessBlocks: [
      {
        id: 'note',
        flavour: 'affine:note',
        bounds: { x: 0, y: 0, width: 800, height: 95 },
        children: [
          { flavour: 'affine:code', language: 'yaml', text: 'publish: true\nslug: hidden' },
          { flavour: 'affine:paragraph', type: 'h2', text: 'Visible heading' },
          { flavour: 'affine:divider' },
          { flavour: 'affine:image', props: { sourceId: 'blob-key', caption: 'A plate' } },
          { flavour: 'affine:bookmark', props: { url: 'https://example.com', title: 'Source' } },
          { flavour: 'affine:latex', props: { latex: 'x^2=1' } },
          {
            flavour: 'affine:table',
            props: {
              'rows.r1.rowId': 'r1',
              'rows.r1.order': 'a0',
              'columns.c1.columnId': 'c1',
              'columns.c1.order': 'a0',
              'cells.r1:c1.text': { text: 'Cell', delta: [{ insert: 'Cell' }] },
            },
          },
        ],
      },
    ],
  });
  assert.partialDeepStrictEqual(canvas.nodes[0], {
    type: 'text',
    text: '## Visible heading',
    content: [
      { type: 'markdown', text: '## Visible heading' },
      { type: 'divider' },
      { type: 'image', src: 'affine://blob/blob-key', caption: 'A plate' },
      { type: 'bookmark', url: 'https://example.com', title: 'Source' },
      { type: 'latex', formula: 'x^2=1' },
      { type: 'table', rows: [['Cell']] },
    ],
  });
  assert.ok((canvas.nodes[0]?.height ?? 0) > 95);
});

test('derives mind-map edges and preserves freehand strokes', () => {
  const canvas = affineCanvasToCanvasData({
    surfaceElements: [
      { id: 'root', type: 'shape', text: 'Root', bounds: { x: 0, y: 0, width: 100, height: 40 } },
      {
        id: 'child',
        type: 'shape',
        text: 'Child',
        bounds: { x: 240, y: 80, width: 100, height: 40 },
      },
      {
        id: 'map',
        type: 'mindmap',
        children: { root: { index: 'a0' }, child: { index: 'a1', parent: 'root' } },
      },
      {
        id: 'stroke',
        type: 'brush',
        bounds: { x: 10, y: 200, width: 80, height: 40 },
        points: [
          [0, 0],
          [80, 40],
        ],
        lineWidth: 5,
      },
    ],
  });
  assert.equal(
    canvas.nodes.find((node) => node.id === 'map'),
    undefined,
  );
  assert.partialDeepStrictEqual(
    canvas.nodes.find((node) => node.id === 'stroke'),
    { type: 'brush', strokeWidth: 5, points: [[0, 0], [80, 40]] },
  );
  assert.ok(
    canvas.edges.some(
      (edge) => edge.fromNode === 'root' && edge.toNode === 'child' && edge.mode === 'curve',
    ),
  );
  assert.equal(
    parseCanvasData(JSON.stringify(canvas)).nodes.find((node) => node.id === 'stroke')?.type,
    'brush',
  );
});

test('nodeLabel and color helpers stay pure', () => {
  assert.equal(
    nodeLabel({
      id: 'a',
      type: 'text',
      text: '## Source\nBody',
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    }),
    'Source',
  );
  assert.equal(
    nodeLabel({
      id: 'b',
      type: 'shape',
      shape: 'rect',
      text: 'Target',
      x: 0,
      y: 0,
      width: 100,
      height: 40,
    }),
    'Target',
  );
  assert.equal(resolveCanvasColor('#64748b'), '#64748b');
});
