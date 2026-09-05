import test from "node:test";
import assert from "node:assert/strict";
import { buildGraph } from "../src/graph/build-graph.mjs";
import {
  enrichNeighbors,
  groupColorIndex,
  localGraph,
} from "../src/graph/graph-utils.mjs";

const fixturePages = [
  {
    url: "/docs",
    data: {
      title: "Welcome",
      outgoingLinks: ["/docs/features", "/docs/graph"],
      tags: ["wiki"],
    },
  },
  {
    url: "/docs/features",
    data: {
      title: "Features",
      outgoingLinks: ["/docs"],
      tags: ["wiki", "publishing/features"],
    },
  },
  {
    url: "/docs/graph",
    data: {
      title: "Graph",
      outgoingLinks: ["/docs/features"],
      tags: ["wiki"],
    },
  },
  {
    url: "/docs/orphan",
    data: {
      title: "Orphan",
      outgoingLinks: [],
      tags: [],
    },
  },
  {
    url: "/docs/tags/wiki",
    data: {
      title: "wiki",
      tagPage: true,
      tag: "wiki",
      description: "Wiki tag page",
    },
  },
  {
    url: "/docs/secret",
    data: {
      title: "Secret",
      unlisted: true,
      outgoingLinks: ["/docs"],
    },
  },
];

test("buildGraph creates page nodes, skips unlisted, and wires outgoing links", () => {
  const graph = buildGraph(fixturePages);
  const pageIds = graph.nodes.filter((n) => n.kind === "page").map((n) => n.id).sort();
  assert.deepEqual(pageIds, [
    "/docs",
    "/docs/features",
    "/docs/graph",
    "/docs/orphan",
  ]);

  const linkPairs = graph.links
    .filter((link) => {
      const source = String(link.source);
      const target = String(link.target);
      return !source.includes("tags") && !target.includes("#") && !target.includes("tags");
    })
    .map((link) => `${link.source}->${link.target}`)
    .sort();

  assert.ok(linkPairs.includes("/docs->/docs/features"));
  assert.ok(linkPairs.includes("/docs/features->/docs"));
  assert.ok(!pageIds.includes("/docs/secret"));
});

test("buildGraph creates hierarchical tag nodes and page→tag edges", () => {
  const graph = buildGraph(fixturePages);
  const tagNodes = graph.nodes.filter((n) => n.kind === "tag");
  const tagTexts = tagNodes.map((n) => n.text).sort();
  assert.ok(tagTexts.includes("#wiki"));
  assert.ok(tagTexts.includes("#publishing"));
  assert.ok(tagTexts.includes("#publishing/features"));

  const wikiTag = tagNodes.find((n) => n.text === "#wiki");
  assert.equal(wikiTag?.url, "/docs/tags/wiki");
  assert.ok(
    graph.links.some(
      (link) => link.source === "/docs/features" && link.target === wikiTag?.id,
    ),
  );
});

test("enrichNeighbors and localGraph depth slicing", () => {
  const base = enrichNeighbors({
    nodes: [
      { id: "a", url: "/a", text: "A" },
      { id: "b", url: "/b", text: "B" },
      { id: "c", url: "/c", text: "C" },
      { id: "d", url: "/d", text: "D" },
    ],
    links: [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "d" },
    ],
  });

  assert.deepEqual(base.nodes.find((n) => n.id === "b")?.neighbors?.sort(), ["a", "c"]);

  const depth1 = localGraph(base, "a", 1);
  assert.deepEqual(depth1.nodes.map((n) => n.id).sort(), ["a", "b"]);

  const depth2 = localGraph(base, "a", 2);
  assert.deepEqual(depth2.nodes.map((n) => n.id).sort(), ["a", "b", "c"]);
});

test("groupColorIndex is stable in 1..12", () => {
  assert.equal(groupColorIndex("docs"), groupColorIndex("docs"));
  const index = groupColorIndex("publishing");
  assert.ok(index >= 1 && index <= 12);
});
