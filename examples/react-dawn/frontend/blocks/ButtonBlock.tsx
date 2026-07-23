import type { ShopifyMeta } from "vite-plugin-react-shopify";
import {
  and,
  createCheckboxSetting,
  createHeaderSetting,
  createTextSetting,
  createUrlSetting,
  defineSettings,
  escape,
  isPresent,
  useLiquidClass,
  useShopifyValue,
  when,
  type ShopifyReference,
} from "vite-plugin-react-shopify/runtime";
import ButtonSnippet from "../snippets/Button";
import { clsx } from "../utils/classes";
import "./ButtonBlock.css";

const buttonSettings = defineSettings("block", {
  first_header: createHeaderSetting({
    content: "t:sections.image-banner.blocks.buttons.settings.header_1.content",
  }),
  button_label_1: createTextSetting({
    default: "t:sections.image-banner.blocks.buttons.settings.button_label_1.default",
    label: "t:sections.image-banner.blocks.buttons.settings.button_label_1.label",
    info: "t:sections.image-banner.blocks.buttons.settings.button_label_1.info",
  }),
  button_link_1: createUrlSetting({
    label: "t:sections.image-banner.blocks.buttons.settings.button_link_1.label",
  }),
  button_style_secondary_1: createCheckboxSetting({
    default: false,
    label: "t:sections.image-banner.blocks.buttons.settings.button_style_secondary_1.label",
  }),
  second_header: createHeaderSetting({
    content: "t:sections.image-banner.blocks.buttons.settings.header_2.content",
  }),
  button_label_2: createTextSetting({
    default: "t:sections.image-banner.blocks.buttons.settings.button_label_2.default",
    label: "t:sections.image-banner.blocks.buttons.settings.button_label_2.label",
    info: "t:sections.image-banner.blocks.buttons.settings.button_label_2.info",
  }),
  button_link_2: createUrlSetting({
    label: "t:sections.image-banner.blocks.buttons.settings.button_link_2.label",
  }),
  button_style_secondary_2: createCheckboxSetting({
    default: false,
    label: "t:sections.image-banner.blocks.buttons.settings.button_style_secondary_2.label",
  }),
});

function ButtonLink({
  label,
  link,
  secondary,
}: {
  label: ShopifyReference<string>;
  link: ShopifyReference<string>;
  secondary: ShopifyReference<boolean>;
}) {
  const resolvedLabel = useShopifyValue(escape(label));
  const resolvedLink = useShopifyValue(link);

  return when(isPresent(label), () =>
    when(
      secondary,
      () => <ButtonSnippet label={resolvedLabel} link={resolvedLink} style="button--secondary" />,
      () => <ButtonSnippet label={resolvedLabel} link={resolvedLink} style="button--primary" />,
    ),
  );
}

export default function ButtonBlock() {
  const { refs } = buttonSettings;
  const multipleClass = useLiquidClass(
    and(isPresent(refs.button_label_1), isPresent(refs.button_label_2)),
    "banner__buttons--multiple",
  );

  return (
    <div className={clsx("banner__buttons", multipleClass)}>
      <ButtonLink
        label={refs.button_label_1}
        link={refs.button_link_1}
        secondary={refs.button_style_secondary_1}
      />
      <ButtonLink
        label={refs.button_label_2}
        link={refs.button_link_2}
        secondary={refs.button_style_secondary_2}
      />
    </div>
  );
}

export const shopifyMeta = {
  name: "t:sections.image-banner.blocks.buttons.name",
  class: "banner__block banner__block--buttons",
  settings: buttonSettings.schema,
} satisfies ShopifyMeta;
