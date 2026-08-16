import type { Metadata } from "next";
import assetsModel from "../uir-package/model/assets.json";
import designSystemModel from "../uir-package/model/design-system.json";
import interfaceModel from "../uir-package/model/interface.json";
import packageModel from "../uir-package/model/package.json";
import provenanceModel from "../uir-package/model/provenance.json";
import manifest from "../uir-package/package.json";
import { Playground } from "./Playground";
import type { UIRManifest, UIRPackageData, UIRShard } from "./runtime";
import "./playground.css";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "UIR Playground — Inspect what the interface means",
  description:
    "Open a UIR package locally, inspect its semantic tree, resolution, presentation bindings, provenance, and package diagnostics.",
};

const initialPackage: UIRPackageData = {
  manifest: manifest as UIRManifest,
  shards: {
    assets: assetsModel as UIRShard,
    "design-system": designSystemModel as UIRShard,
    interface: interfaceModel as UIRShard,
    package: packageModel as UIRShard,
    provenance: provenanceModel as UIRShard,
  },
  sourceName: "UIR public site",
  diagnostics: [
    {
      severity: "success",
      code: "example.checked",
      message: "Loaded the checked UIR package that renders the public UIR site.",
    },
  ],
};

export default function PlaygroundPage() {
  return <Playground initialPackage={initialPackage} />;
}
