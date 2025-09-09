import type { Meta, StoryObj } from "@storybook/react";

function Tokens() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="glass rounded p-4">
        <div className="font-semibold mb-2">Glass</div>
        <div className="h-20 glass rounded" />
      </div>
      <div className="glass rounded p-4">
        <div className="font-semibold mb-2">Radii & Shadows</div>
        <div className="flex gap-2">
          <div className="w-16 h-16 glass rounded" />
          <div className="w-16 h-16 glass rounded-lg" />
          <div className="w-16 h-16 glass rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Theme/Tokens",
  component: Tokens,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: "Theme tokens (glass, radii, shadows, colors). Design reference: /assets/example.gif"
      }
    }
  }
} satisfies Meta<typeof Tokens>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <Tokens /> };
