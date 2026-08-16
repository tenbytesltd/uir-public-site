import { Inspector } from "./Inspector";
import {
  Brand,
  Code,
  Document,
  Group,
  Heading,
  Link,
  List,
  ListItem,
  Navigation,
  Paragraph,
  Region,
} from "./design-system";
import {
  uirInspectionNodes,
  uirManifest,
  uirThemeStyle,
} from "./uir-data";

function Header() {
  return (
    <Navigation uirKey="navigation">
      <Brand uirKey="brand" />
      <Link uirKey="nav-extract" />
      <Link uirKey="nav-build" />
      <Link uirKey="nav-standard" />
      <Link uirKey="nav-source" />
    </Navigation>
  );
}

function Hero() {
  return (
    <Region uirKey="hero">
      <Paragraph uirKey="hero-kicker" />
      <Heading uirKey="hero-title" level={1} />
      <Paragraph uirKey="hero-lead" />
      <Group uirKey="hero-actions">
        <Link uirKey="hero-primary" />
        <Link uirKey="hero-secondary" />
      </Group>
      <Code uirKey="hero-command" />
      <Paragraph uirKey="install-gap" />
    </Region>
  );
}

function ProblemCard({ card, title, copy }: { card: string; title: string; copy: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
    </Region>
  );
}

function Problem() {
  return (
    <Region uirKey="problem">
      <Paragraph uirKey="problem-kicker" />
      <Heading uirKey="problem-title" level={2} />
      <Paragraph uirKey="problem-lead" />
      <Group uirKey="problem-grid">
        <ProblemCard card="problem-design" title="problem-design-title" copy="problem-design-copy" />
        <ProblemCard card="problem-code" title="problem-code-title" copy="problem-code-copy" />
        <ProblemCard card="problem-system" title="problem-system-title" copy="problem-system-copy" />
      </Group>
    </Region>
  );
}

function FlowCard({ card, title, copy }: { card: string; title: string; copy: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
    </Region>
  );
}

function Mechanism() {
  return (
    <Region uirKey="mechanism">
      <Paragraph uirKey="mechanism-kicker" />
      <Heading uirKey="mechanism-title" level={2} />
      <Paragraph uirKey="mechanism-copy" />
      <Group uirKey="mechanism-flow">
        <FlowCard card="flow-input" title="flow-input-title" copy="flow-input-copy" />
        <FlowCard card="flow-package" title="flow-package-title" copy="flow-package-copy" />
        <FlowCard card="flow-prototype" title="flow-prototype-title" copy="flow-prototype-copy" />
      </Group>
    </Region>
  );
}

function Playground() {
  return (
    <Region uirKey="showcase">
      <Paragraph uirKey="showcase-kicker" />
      <Heading uirKey="showcase-title" level={2} />
      <Paragraph uirKey="showcase-copy" />
      <Group uirKey="showcase-grid">
        <FlowCard card="showcase-source" title="showcase-source-title" copy="showcase-source-copy" />
        <FlowCard card="showcase-review" title="showcase-review-title" copy="showcase-review-copy" />
        <FlowCard card="showcase-inspect" title="showcase-inspect-title" copy="showcase-inspect-copy" />
      </Group>
      <Group uirKey="showcase-actions">
        <Link uirKey="showcase-repository" />
        <Code uirKey="showcase-path" />
      </Group>
    </Region>
  );
}

function CaptureCard({ card, title, copy, command }: { card: string; title: string; copy: string; command: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
      <Code uirKey={command} />
    </Region>
  );
}

function WhatItCaptures() {
  return (
    <Region uirKey="quickstart">
      <Paragraph uirKey="quickstart-kicker" />
      <Heading uirKey="quickstart-title" level={2} />
      <Paragraph uirKey="quickstart-copy" />
      <Group uirKey="quickstart-steps">
        <CaptureCard card="quickstart-read" title="quickstart-read-title" copy="quickstart-read-copy" command="quickstart-read-command" />
        <CaptureCard card="quickstart-see" title="quickstart-see-title" copy="quickstart-see-copy" command="quickstart-see-command" />
        <CaptureCard card="quickstart-adopt" title="quickstart-adopt-title" copy="quickstart-adopt-copy" command="quickstart-adopt-command" />
      </Group>
    </Region>
  );
}

function HowItFits() {
  return (
    <Region uirKey="build">
      <Paragraph uirKey="build-kicker" />
      <Heading uirKey="build-title" level={2} />
      <Paragraph uirKey="build-copy" />
      <List uirKey="build-steps">
        <ListItem uirKey="build-step-1" />
        <ListItem uirKey="build-step-2" />
        <ListItem uirKey="build-step-3" />
        <ListItem uirKey="build-step-4" />
      </List>
    </Region>
  );
}

function PrincipleCard({ card, title, copy }: { card: string; title: string; copy: string }) {
  return (
    <Region uirKey={card}>
      <Heading uirKey={title} level={3} />
      <Paragraph uirKey={copy} />
    </Region>
  );
}

function WhyItWorks() {
  return (
    <Region uirKey="standard">
      <Paragraph uirKey="standard-kicker" />
      <Heading uirKey="standard-title" level={2} />
      <Paragraph uirKey="standard-copy" />
      <Group uirKey="standard-grid">
        <PrincipleCard card="standard-source" title="standard-source-title" copy="standard-source-copy" />
        <PrincipleCard card="standard-evidence" title="standard-evidence-title" copy="standard-evidence-copy" />
        <PrincipleCard card="standard-gaps" title="standard-gaps-title" copy="standard-gaps-copy" />
        <PrincipleCard card="standard-targets" title="standard-targets-title" copy="standard-targets-copy" />
      </Group>
    </Region>
  );
}

function Status() {
  return (
    <Region uirKey="status">
      <Paragraph uirKey="status-kicker" />
      <Heading uirKey="status-title" level={2} />
      <Paragraph uirKey="status-copy" />
      <List uirKey="status-list">
        <ListItem uirKey="status-item-1" />
        <ListItem uirKey="status-item-2" />
        <ListItem uirKey="status-item-3" />
      </List>
    </Region>
  );
}

function Footer() {
  return (
    <Region uirKey="footer">
      <Heading uirKey="footer-title" level={2} />
      <Paragraph uirKey="footer-copy" />
      <Link uirKey="footer-action" />
    </Region>
  );
}

export function PublicSite() {
  return (
    <>
      <div
        className="uir-target"
        data-uir-package={uirManifest.packageId}
        data-uir-version={uirManifest.packageVersion}
        style={uirThemeStyle()}
      >
        <Document uirKey="root">
          <Header />
          <Hero />
          <Problem />
          <Mechanism />
          <Playground />
          <WhatItCaptures />
          <HowItFits />
          <WhyItWorks />
          <Status />
          <Footer />
        </Document>
      </div>
      <Inspector
        nodes={uirInspectionNodes}
        packageId={uirManifest.packageId}
        packageVersion={uirManifest.packageVersion}
        recordCount={uirInspectionNodes.length}
      />
    </>
  );
}
