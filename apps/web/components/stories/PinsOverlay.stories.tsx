import type { Meta, StoryObj } from "@storybook/react";
import { PinsOverlay } from "../shell/PinsOverlay";

const meta = {
  title: "Shell/PinsOverlay",
  component: PinsOverlay,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "Tap targets for device selection. A11y: role=list with listitems, each button has aria-label with device name."
      }
    }
  }
} satisfies Meta<typeof PinsOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[240px] w-[360px] glass">
      <PinsOverlay />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import('@storybook/test');
    const canvas = within(canvasElement);
    const btns = await canvas.findAllByRole('button');
    if (btns[0]) await userEvent.click(btns[0]);
  }
};
