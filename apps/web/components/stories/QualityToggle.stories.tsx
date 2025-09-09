import type { Meta, StoryObj } from "@storybook/react";
import { PerformanceToggle } from "../ui/performance-toggle";
import { useState } from "react";

function Wrapper() {
  const [value, setValue] = useState<'Ultra'|'High'|'Balanced'|'Battery'>('High');
  return <PerformanceToggle value={value} onChange={(v)=> setValue(v)} />;
}

const meta = {
  title: "Controls/QualityToggle",
  component: Wrapper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: "Quality/performance toggle. A11y: buttons have focus rings; use with a provider to affect materials and post-processing."
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
    const balanced = await canvas.findByRole('button', { name: /Balanced/i });
    await userEvent.click(balanced);
    const battery = await canvas.findByRole('button', { name: /Battery/i });
    await userEvent.click(battery);
  }
};
