import type { Meta, StoryObj } from "@storybook/react";
import { SelectedDrawer } from "../drawer/SelectedDrawer";
import { useEffect } from "react";
import { useDevices } from "@homegraph/devices";

function Wrapper() {
  useEffect(() => { try { useDevices.getState().setSelected('light-1'); } catch {} }, []);
  return (
    <div className="relative h-[400px] w-[720px]">
      <SelectedDrawer />
    </div>
  );
}

const meta = {
  title: "Controls/DeviceControls",
  component: Wrapper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "Device controls surface. A11y: rendered as a dialog (role=dialog), Esc to close, focus rings on interactive elements."
      }
    }
  }
} satisfies Meta<typeof Wrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Wrapper />,
  play: async ({ canvasElement }) => {
    const { within, userEvent, fireEvent } = await import('@storybook/test');
    const canvas = within(canvasElement);
    const power = await canvas.findByRole('switch');
    await userEvent.click(power);
    const slider = (await canvas.findByRole('slider', { name: /brightness/i })) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '0.8' } });
  }
};
