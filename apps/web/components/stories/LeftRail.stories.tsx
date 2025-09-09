import type { Meta, StoryObj } from "@storybook/react";
import { DeviceRail } from "../shell/DeviceRail";
import { DayNightProvider } from "@homegraph/engine";

const meta = {
  title: "Shell/LeftRail",
  component: DeviceRail,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "Primary navigation rail. A11y: headings labeled, lists have roles, sliders include aria labels. Design reference: /assets/example.gif"
      }
    }
  },
  argTypes: {
    perf: { control: { type: 'radio' }, options: ['Ultra','High','Balanced','Battery'] },
    geo: { control: 'object' }
  }
} satisfies Meta<typeof DeviceRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { perf: 'High', geo: { lat: 44.97, lon: -93.26 } },
  render: (args) => (
    <DayNightProvider lat={args.geo.lat} lon={args.geo.lon}>
      <div className="w-[320px] p-4 glass">
        <DeviceRail dayState={[0.5, () => {}]} onPerfChange={() => {}} perf={args.perf as any} geo={args.geo as any} onGeoChange={() => {}} />
      </div>
    </DayNightProvider>
  ),
  play: async ({ canvasElement }) => {
    const { within, userEvent } = await import('@storybook/test');
    const canvas = within(canvasElement);
    const evening = await canvas.findByRole('button', { name: /Evening/i });
    await userEvent.hover(evening);
    await new Promise((r)=> setTimeout(r, 300));
    await userEvent.unhover(evening);
  }
};
