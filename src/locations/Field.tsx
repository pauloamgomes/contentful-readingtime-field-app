import { FieldAppSDK } from "@contentful/app-sdk";
import { Box, IconButton, Note, Stack } from "@contentful/f36-components";
import { useSDK } from "@contentful/react-apps-toolkit";
import { documentToPlainTextString } from "@contentful/rich-text-plain-text-renderer";
import { getRichTextEntityLinks } from "@contentful/rich-text-links";
import { useEffect, useRef, useState } from "react";
import { ClockIcon, EditIcon, LockIcon } from "@contentful/f36-icons";
import readingTime from "reading-time/lib/reading-time";
import markdownToTxt from "markdown-to-txt";

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();
  const debounceInterval: any = useRef(false);
  const [value, setValue] = useState(sdk.field.getValue() || {});

  const {
    wordsPerMinute = 225,
    allowOverride = true,
    secondsPerAsset = 10,
    secondsPerEntry = 10,
  } = sdk.parameters.installation;

  const { bodyFieldId = "" } = sdk.parameters.instance;
  const bodyField = sdk.entry.fields?.[bodyFieldId];

  useEffect(() => {
    sdk.window.startAutoResizer();

    if (!bodyField) {
      return;
    }

    const locales = sdk.entry.fields[bodyFieldId].locales;
    const listeners: (() => void)[] = [];

    for (const locale of locales) {
      const listener = bodyField.onValueChanged(locale, (textFieldValue) => {
        const fieldLocale = sdk.field.locale;
        const value = sdk.field.getValue();

        if (!value?.overriden && locale === fieldLocale) {
          if (debounceInterval.current) {
            clearInterval(debounceInterval.current);
          }
          debounceInterval.current = setTimeout(() => {
            const newValue = getReadingTime(textFieldValue);
            updateFieldValue(newValue);
          }, 500);
        }
      });

      listeners.push(listener);
    }

    sdk.field.onValueChanged((newValue) => {
      if (JSON.stringify(newValue) !== JSON.stringify(value)) {
        setValue(newValue);
      }
    });

    return () => {
      for (const listener of listeners) {
        listener?.();
      }
    };
  }, []);

  const updateFieldValue = (newValue: any) => {
    if (JSON.stringify(newValue) !== JSON.stringify(value)) {
      sdk.field.setValue(newValue);
    }
  };

  const getReadingTime = (textFieldValue: any) => {
    let plainText = textFieldValue || "";
    let entries = 0;
    let assets = 0;

    if (bodyField.type === "RichText") {
      assets =
        getRichTextEntityLinks(textFieldValue, "embedded-asset-block")?.Asset
          ?.length || 0;
      entries =
        getRichTextEntityLinks(textFieldValue, "embedded-entry-block")?.Entry
          ?.length || 0;
      plainText = documentToPlainTextString(textFieldValue);
    } else if (bodyField.type === "Text") {
      const imageMatches = textFieldValue.match(/!\[.*?\]\((.*?)\)/g);
      const embeddedMatches = textFieldValue.match(
        /<a[^>]+class\s*=\s*["']embedly-card["'][^>]*>/gi
      );
      assets = imageMatches ? imageMatches.length : 0;
      entries = embeddedMatches ? embeddedMatches.length : 0;
      plainText = stripHtmlTags(markdownToTxt(textFieldValue || ""));
    }

    const readingTimeValue = readingTime(plainText, { wordsPerMinute });
    const totalMinutes =
      readingTimeValue.minutes +
      (entries * secondsPerEntry) / 60 +
      (assets * secondsPerAsset) / 60;

    readingTimeValue.minutes = totalMinutes.toFixed(1);
    readingTimeValue.assets = assets;
    readingTimeValue.entries = entries;

    return readingTimeValue;
  };

  const {
    minutes = 0,
    time = 0,
    words = 0,
    assets = 0,
    entries = 0,
    overriden = false,
  } = value || {};

  if (!bodyField) {
    return (
      <Note variant="negative" title="Configuration error">
        There is no field with id "<strong>{bodyFieldId}</strong>" in this
        content.
        <br />
        Check your field id in the field appearance configuration.
      </Note>
    );
  }

  return (
    <Stack flexDirection="column">
      <Box style={{ width: "100%" }}>
        <Stack spacing="spacing2Xs">
          <ClockIcon variant="secondary" />
          <Box>
            {minutes === 1 ? "1 minute" : `${minutes} minutes`},
            {time === 1 ? " 1 second" : ` ${time} seconds`},
            {words === 1 ? " 1 word" : ` ${words} words`},
            {assets === 1 ? " 1 asset" : ` ${assets} assets`},
            {entries === 1 ? " 1 entry" : ` ${entries} entries`}
          </Box>
          {overriden && <LockIcon size="tiny" variant="negative" />}
        </Stack>
      </Box>
      {allowOverride ? (
        <Box style={{ width: "100%" }}>
          <IconButton
            variant="secondary"
            size="small"
            icon={<EditIcon size="tiny" />}
            aria-label="Override default value"
            onClick={async () => {
              const result = await sdk.dialogs.openPrompt({
                title: "Override calculated reading time",
                message:
                  "Enter new reading time in minutes (leave it empty to reset and use instead calculated value):",
                intent: "positive",
                defaultValue: minutes.toString(),
              });

              if (result === "") {
                const overridenTime = getReadingTime(bodyField.getValue());
                setValue({ overriden: false, ...overridenTime });
                updateFieldValue({ overriden: false, ...overridenTime });
              } else if (
                typeof result === "string" &&
                /^\d*\.?\d+$/.test(result)
              ) {
                const updated = {
                  overriden: true,
                  minutes: parseFloat(result).toFixed(1),
                  time: parseInt(result, 10) * 60,
                  words: parseInt(result, 10) * wordsPerMinute,
                  assets: 0,
                  entries: 0,
                }
                setValue(updated);
                updateFieldValue(updated);
              }
            }}
          >
            {overriden ? "Edit overriden value" : "Edit calculated value"}
          </IconButton>
        </Box>
      ) : null}
    </Stack>
  );
};

export default Field;
