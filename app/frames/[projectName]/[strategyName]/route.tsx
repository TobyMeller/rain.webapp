import { farcasterHubContext } from "frames.js/middleware";
import { Button, createFrames } from "frames.js/next";
import { FrameImage } from "../../../_components/FrameImage";
import yaml from "js-yaml";
import fs from "fs";
import { YamlData } from "../../../_types/yamlData";
import { generateButtonsData } from "../../../_services/buttons";
import { FrameState } from "../../../_types/frame";
import { getUpdatedFrameState } from "../../../_services/frameState";
import path from "path";

const frames = createFrames<FrameState>({
  basePath: "",
  middleware: [
    farcasterHubContext({
      // remove if you aren't using @frames.js/debugger or you just don't want to use the debugger hub
      ...(process.env.NODE_ENV === "production"
        ? {}
        : {
            hubHttpUrl: "http://localhost:3010/hub",
          }),
    }),
  ],
  initialState: {
    strategyName: null,
    currentStep: "start",
    deploymentOption: null,
    bindings: {},
    deposit: null,
    buttonPage: 0,
    textInputLabel: "",
    error: null,
  },
});

const parseButtonsData = (buttonsData: any[]) => {
  return buttonsData.map((button) => (
    <Button
      action="post"
      target={{ query: { [button.buttonTarget]: button.buttonValue } }}
    >
      {button.buttonText}
    </Button>
  ));
};

const handleRequest = frames(async (ctx) => {
  const projectName = ctx.url.pathname.split("/")[2];
  const strategyName = ctx.url.pathname.split("/")[3];

  const filePath = path.join(
    process.cwd(),
    "app",
    "_strategies",
    projectName,
    `${strategyName}.rain`
  );
  const yamlText = fs.readFileSync(filePath, "utf8").split("---")[0];
  const yamlData = yaml.load(yamlText) as YamlData;

  if (!ctx.state.strategyName) {
    ctx.state.strategyName = yamlData.gui.name;
  }
  let currentState = { ...ctx.state };

  // Handle page navigation
  if (ctx.url.searchParams.has("textInputLabel")) {
    currentState.textInputLabel = ctx.url.searchParams.get(
      "textInputLabel"
    ) as string;
    currentState.error = null;
  } else if (ctx.url.searchParams.has("buttonPage")) {
    currentState.buttonPage = parseInt(ctx.url.searchParams.get("buttonPage")!);
  } else {
    // Handle state transitions
    const buttonValue = ctx.url.searchParams.get("buttonValue");
    const inputText = ctx.message?.inputText;
    currentState = getUpdatedFrameState(
      yamlData,
      currentState,
      buttonValue,
      inputText
    );
  }

  const buttonsData = generateButtonsData(yamlData, currentState);

  return {
    image: <FrameImage currentState={currentState} />,
    buttons: parseButtonsData(buttonsData),
    textInput: currentState.textInputLabel,
    state: currentState,
  };
});

export const GET = handleRequest;
export const POST = handleRequest;
