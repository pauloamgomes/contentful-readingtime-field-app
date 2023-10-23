import { SidebarAppSDK } from "@contentful/app-sdk";
import {
  Box,
  Card,
  Flex,
  SectionHeading,
  Text,
} from "@contentful/f36-components";
import { /* useCMA, */ useSDK } from "@contentful/react-apps-toolkit";
import { LockIcon } from "@contentful/f36-icons";
import { useEffect, useState } from "react";

interface IValue {
  minutes: number;
  time: number;
  words: number;
  assets: number;
  entries: number;
  overriden: boolean;
}

const ReadingTimeRow = ({
  value,
  locale,
  isLocalized,
}: {
  value: IValue;
  locale?: string;
  isLocalized?: boolean;
}) => {
  const {
    minutes = 0,
    time = 0,
    words = 0,
    assets = 0,
    entries = 0,
    overriden = false,
  } = value || {};

  return (
    <Flex flexDirection="column" gap="spacing2Xs" marginBottom="spacingXs">
      {isLocalized ? (
        <Box>
          <Flex
            alignItems="center"
            gap="spacingS"
            justifyContent="space-between"
          >
            <SectionHeading marginBottom="none" marginTop="none">
              {locale}
            </SectionHeading>
            {overriden && <LockIcon size="tiny" variant="negative" />}
          </Flex>
        </Box>
      ) : null}

      <Box>
        <Flex flexDirection="column" gap="none">
          <Text fontSize="fontSizeM">
            {minutes === 1 ? "1 minute" : `${minutes} minutes`},
            {time === 1 ? " 1 second" : ` ${time} seconds`}
          </Text>
          <Text fontSize="fontSizeM">
            {words === 1 ? " 1 word" : ` ${words} words`},
            {assets === 1 ? " 1 asset" : ` ${assets} assets`},
            {entries === 1 ? " 1 entry" : ` ${entries} entries`}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
};

const Sidebar = () => {
  const sdk = useSDK<SidebarAppSDK>();
  const [value, setValue] = useState({} as Record<string, IValue>);
  const { bodyFieldId = "" } = sdk.parameters.instance;

  useEffect(() => {
    sdk.window.startAutoResizer();

    let listener: any = null;

    const initListener = async () => {
      const editorInterface = await sdk.cma.editorInterface.get({
        contentTypeId: sdk.contentType.sys.id,
      });
      const control = editorInterface.controls?.find(
        (control) => control.settings?.bodyFieldId === bodyFieldId
      );

      if (!control?.fieldId) {
        return;
      }

      const field = sdk.entry.fields[control.fieldId];
      const locales = sdk.entry.fields[control.fieldId].locales;
      const isLocalized = sdk.contentType.fields.find(
        (field) => field.id === control.fieldId
      )?.localized;

      listener = sdk.entry.onSysChanged(() => {
        const newValue = {} as Record<string, IValue>;
        if (isLocalized) {
          for (const locale of locales) {
            newValue[locale] = field.getForLocale(locale).getValue();
          }
        } else {
          newValue[sdk.locales.default] = field.getValue();
        }
        setValue(newValue);
      });
    };

    initListener();

    return () => listener?.();
  }, []);

  return (
    <Card>
      {Object.keys(value).map((locale) => (
        <ReadingTimeRow
          key={locale}
          value={value[locale]}
          locale={sdk.locales.names[locale]}
          isLocalized={Object.keys(value).length > 1}
        />
      ))}
    </Card>
  );
};

export default Sidebar;
