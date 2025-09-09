import type { Meta, StoryObj } from "@storybook/react";
import { DeviceRail } from "../shell/DeviceRail";
import { DayNightProvider } from "@homegraph/engine";

const meta = {
  title: "Controls/DayNight",
  component: DeviceRail,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: { component: "Day/Night controls demoed via LeftRail section. Sliders include aria labels; respects prefers-reduced-motion."
      }
    }
  },
  argTypes: {
    hour: { control: { type: 'range', min: 0, max: 24, step: 0.25 } }
  }
} satisfies Meta<typeof DeviceRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DayNightProvider lat={44.97} lon={-93.26}>
      <div className="w-[320px] p-4 glass">
        <DeviceRail dayState={[0.5, () => {}]} onPerfChange={() => {}} perf={'High'} geo={{ lat: 44.97, lon: -93.26 }} onGeoChange={() => {}} />
      </div>
    </DayNightProvider>
  ),
  play: async ({ canvasElement }) => {
    const { within, fireEvent } = await import('@storybook/test');
    const canvas = within(canvasElement);
    const slider = (await canvas.findByRole('slider', { name: /Local time/i })) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '12' } });
  }
};
