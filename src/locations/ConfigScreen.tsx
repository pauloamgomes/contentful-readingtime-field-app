import { ConfigAppSDK } from "@contentful/app-sdk";
import {
  Flex,
  Form,
  FormControl,
  Heading,
  Paragraph,
  Switch,
  TextInput,
} from "@contentful/f36-components";
import { useSDK } from "@contentful/react-apps-toolkit";
import { css } from "emotion";
import { useCallback, useEffect, useState } from "react";

export interface AppInstallationParameters {
  wordsPerMinute: string;
  secondsPerAsset: string;
  secondsPerEntry: string;
  allowOverride: boolean;
}

const ConfigScreen = () => {
  const [parameters, setParameters] = useState<AppInstallationParameters>({
    wordsPerMinute: "225",
    secondsPerAsset: "10",
    secondsPerEntry: "10",
    allowOverride: true,
  });

  const sdk = useSDK<ConfigAppSDK>();

  const isValid = () => {
    if (parameters.wordsPerMinute === "" || !/^[0-9]+$/.test(parameters.wordsPerMinute)) {
      return false;
    }
    if (parameters.secondsPerAsset === "" || !/^[0-9]+$/.test(parameters.secondsPerAsset)) {
      return false;
    }
    if (parameters.secondsPerEntry === "" || !/^[0-9]+$/.test(parameters.secondsPerEntry)) {
      return false;
    }

    return true;
  }

  const onConfigure = useCallback(async () => {
    if (!isValid()) {
      sdk.notifier.error("Invalid configuration, please check the values.");
      return false;
    }
    // This method will be called when a user clicks on "Install"
    // or "Save" in the configuration screen.
    // for more details see https://www.contentful.com/developers/docs/extensibility/ui-extensions/sdk-reference/#register-an-app-configuration-hook

    // Get current the state of EditorInterface and other entities
    // related to this app installation
    const currentState = await sdk.app.getCurrentState();

    return {
      // Parameters to be persisted as the app configuration.
      parameters,
      // In case you don't want to submit any update to app
      // locations, you can just pass the currentState as is
      targetState: currentState,
    };
  }, [parameters, sdk]);

  useEffect(() => {
    // `onConfigure` allows to configure a callback to be
    // invoked when a user attempts to install the app or update
    // its configuration.
    sdk.app.onConfigure(() => onConfigure());
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      // Get current parameters of the app.
      // If the app is not installed yet, `parameters` will be `null`.
      const currentParameters: AppInstallationParameters | null =
        await sdk.app.getParameters();

      if (currentParameters) {
        setParameters(currentParameters);
      }

      // Once preparation has finished, call `setReady` to hide
      // the loading screen and present the app to a user.
      sdk.app.setReady();
    })();
  }, [sdk]);

  const { allowOverride, wordsPerMinute, secondsPerAsset, secondsPerEntry } = parameters;

  return (
    <Flex
      flexDirection="column"
      className={css({ margin: "80px", maxWidth: "800px" })}
    >
      <Form>
        <Heading>Reading Time Field Config</Heading>
        <Paragraph>
          Configure the Reading Time Field Application:
        </Paragraph>

        <FormControl>
          <FormControl.Label>Allow Manual Override</FormControl.Label>
          <Switch
            name="show-preview"
            id="show-preview"
            isChecked={allowOverride}
            onChange={(e) =>
              setParameters({
                ...parameters,
                allowOverride: e.target.checked,
              })
            }
          >
            {allowOverride ? "Yes" : "No"}
          </Switch>
          <FormControl.HelpText>
            If enabled, the user can manually override the calculated reading
            time.
          </FormControl.HelpText>
        </FormControl>

        <FormControl>
          <FormControl.Label>Words Per Minute</FormControl.Label>
          <TextInput
            id="words-per-minute"
            type="text"
            name="words-per-minute"
            isRequired
            value={wordsPerMinute}
            isInvalid={!/^[0-9]+$/.test(wordsPerMinute)}
            onChange={(e) => {
              setParameters({
                ...parameters,
                wordsPerMinute: e.target.value,
              });
            }}
          />
          <FormControl.HelpText>
            Set the words per minute to use for the calculation.
          </FormControl.HelpText>
        </FormControl>

        <FormControl>
          <FormControl.Label>Seconds per Asset</FormControl.Label>
          <TextInput
            id="seconds-per-asset"
            type="text"
            name="seconds-per-asset"
            isRequired
            isInvalid={!/^[0-9]+$/.test(secondsPerAsset)}
            value={secondsPerAsset}
            onChange={(e) => {
              setParameters({
                ...parameters,
                secondsPerAsset: e.target.value,
              });
            }}
          />
          <FormControl.HelpText>
            Number of seconds per asset found in the field.<br />
            Use 0 to ignore.<br />
            This may not be completely accurate as you can have assets referenced inside nested entries.
          </FormControl.HelpText>
        </FormControl>

        <FormControl>
          <FormControl.Label>Seconds per Embedded Entry</FormControl.Label>
          <TextInput
            id="seconds-per-entry"
            type="text"
            name="seconds-per-entry"
            isRequired
            value={secondsPerEntry}
            isInvalid={!/^[0-9]+$/.test(secondsPerEntry)}
            onChange={(e) => {
              setParameters({
                ...parameters,
                secondsPerEntry: e.target.value,
              });
            }}
          />
          <FormControl.HelpText>
            Number of seconds per embedded entry found in the field.<br />
            Use 0 to ignore.<br />
            This may not be completely accurate as it depends on the type of the entry.
          </FormControl.HelpText>
        </FormControl>        

      </Form>
    </Flex>
  );
};

export default ConfigScreen;
