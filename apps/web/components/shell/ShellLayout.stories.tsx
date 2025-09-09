import type { Meta, StoryObj } from "@storybook/react";
import { DeviceRail } from "./DeviceRail";

const meta = {
  title: "Shell/Layout",
  component: DeviceRail,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "Layout inspired by /assets/example.gif. Dark-glass aesthetic with focus rings."
      }
    }
  }
} satisfies Meta<typeof DeviceRail>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Rail: Story = {
  render: () => (
    <div className="w-[320px] p-4 glass">
      <DeviceRail dayState={[0.5, () => {}]} onPerfChange={() => {}} />
    </div>
  )
};
