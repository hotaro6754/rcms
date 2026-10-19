import type { Design, DesignNode } from "@/lib/design/schema";
import { SLOTS } from "@/lib/design/schema";
import { ComponentView, type DesignContext } from "./views";

/** Draws a checked design for learners and visitors (no designer code is loaded). */
export function DesignView({ design, ctx }: { design: Design; ctx: DesignContext }) {
  const bg = design.root?.props?.background;
  return (
    <div className="flex flex-col gap-6" style={bg ? { background: bg } : undefined}>
      {design.content.map((n) => (
        <Node key={n.props.id} node={n} ctx={ctx} />
      ))}
    </div>
  );
}

function Node({ node, ctx }: { node: DesignNode; ctx: DesignContext }) {
  const slots: Record<string, React.ReactNode> = {};
  for (const slot of SLOTS[node.type] ?? []) {
    slots[slot] = ((node.props[slot] as DesignNode[] | undefined) ?? []).map((c) => <Node key={c.props.id} node={c} ctx={ctx} />);
  }
  return <ComponentView type={node.type} props={node.props} ctx={ctx} slots={slots} />;
}
