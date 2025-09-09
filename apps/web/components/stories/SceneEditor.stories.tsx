import type { Meta, StoryObj } from "@storybook/react";
import { SceneEditorDrawer } from "../drawer/SceneEditorDrawer";
import { useEffect } from "react";

function Wrapper() {
  useEffect(() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('scene-editor:open')); }, []);
  return (
    <div className="relative h-[400px] w-[720px]">
      <SceneEditorDrawer />
    </div>
  );
}

const meta = {
  title: "Controls/SceneEditor",
  component: Wrapper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "Scene editor drawer. A11y: dialog role, focus management, labeled controls; hover to preview, click to apply."
      }
    }
  }
} satisfies Meta<typeof Wrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Wrapper />,
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import('@storybook/test');
    const canvas = within(canvasElement);
    const add = await canvas.findByRole('button', { name: /Add Step/i });
    await userEvent.click(add);
  }
};
