import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckSquare2, Square } from "lucide-react";
import React, { useState } from "react";
import { vanityDurationToSeconds } from "db-vanity-model/src/utils.ts";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { calculateWorkUnitForProblems } from "@/utils/difficulty";
import { displayDifficulty } from "@/utils";
import { Alert } from "@/components/ui/alert";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  VanityRequestSchema,
  Problem,
  ProblemId,
} from "db-vanity-model/src/order-schema.ts";
import { problems, problemsById } from "./problem-config";
import { Link } from "react-router-dom";
import { toast } from "@/components/Toast";
import { KeyGuideSheet } from "./KeyGuideSheet";
import { makeClient } from "@/order/helpers.ts";

const FormSchema = z
  .object({
    keyType: z.enum(["publicKey", "xpub"]),
    publicKey: z.string(),
    duration: z.string(),
    problems: z
      .object({
        "leading-any": z
          .object({
            enabled: z.boolean(),
            length: z.number(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (data.length < 8 || data.length > 40) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Length must be between 8 and 40",
                  path: ["length"],
                });
              }
            }
          }),
        "trailing-any": z
          .object({
            enabled: z.boolean(),
            length: z.number(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (data.length < 8 || data.length > 40) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Length must be between 8 and 40",
                  path: ["length"],
                });
              }
            }
          }),
        "letters-heavy": z
          .object({
            enabled: z.boolean(),
            count: z.number(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (data.count < 32 || data.count > 40) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Count must be between 32 and 40",
                  path: ["count"],
                });
              }
            }
          }),
        "numbers-heavy": z.object({
          enabled: z.boolean(),
        }),
        "snake-score-no-case": z
          .object({
            enabled: z.boolean(),
            count: z.number(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (data.count < 15 || data.count > 39) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Count must be between 15 and 39",
                  path: ["count"],
                });
              }
            }
          }),
        "user-prefix": z
          .object({
            enabled: z.boolean(),
            specifier: z.string(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (!data.specifier.startsWith("0x")) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Specifier must start with 0x",
                  path: ["specifier"],
                });
              }
              if (data.specifier.length < 8 || data.specifier.length > 42) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Specifier must be between 8 and 42 characters",
                  path: ["specifier"],
                });
              }
              if (!/^0x[0-9a-f]+$/i.test(data.specifier)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Specifier must be a valid hex string",
                  path: ["specifier"],
                });
              }
            }
          }),
        "user-suffix": z
          .object({
            enabled: z.boolean(),
            specifier: z.string(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (data.specifier.length < 6 || data.specifier.length > 40) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Specifier must be between 6 and 40 characters",
                  path: ["specifier"],
                });
              }
              if (!/^[0-9a-f]+$/i.test(data.specifier)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "Specifier must be a valid hex string",
                  path: ["specifier"],
                });
              }
            }
          }),
        "user-mask": z
          .object({
            enabled: z.boolean(),
            specifier: z.string(),
          })
          .superRefine((data, ctx) => {
            if (data.enabled) {
              if (data.specifier.length !== 40) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message:
                    "Specifier must be 40 characters long (don't include the 0x prefix)",
                  path: ["specifier"],
                });
              }
            }
          }),
      })
      .refine(
        (data) => Object.values(data).some((problem) => problem.enabled),
        {
          message: "Select at least one problem",
          path: ["problems"],
        },
      ),
  })
  .superRefine((val, ctx) => {
    const keyType = val.keyType;
    const publicKey = val.publicKey;
    if (keyType === "publicKey") {
      if (!publicKey.startsWith("0x") || publicKey.length !== 132) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Public key must start with 0x and be 132 characters long",
          path: ["publicKey"],
        });
      }
    } else if (keyType === "xpub") {
      if (!publicKey.startsWith("xpub") || publicKey.length !== 111) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "xpub must start with xpub and be 111 characters long",
          path: ["publicKey"],
        });
      }
    }
  });

const getEthereumGlobal = () => {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return (window as any).ethereum;
  }
  return null;
};

async function sendOrder(data: z.infer<typeof FormSchema>) {
  const arkivClient = makeClient();

  const timestamp = new Date().toISOString();
  const utf8Encode = new TextEncoder();

  const selectedProblems = Object.entries(data.problems)
    .filter(([_, value]) => value.enabled)
    .map(([key, value]) => ({
      type: key,
      ...value,
    }));
  const parsedEntity = VanityRequestSchema.parse({
    publicKey: data.publicKey,
    problems: selectedProblems,
    duration: data.duration,
    cancelledAt: null,
  });

  return await arkivClient.createEntity({
    payload: utf8Encode.encode(
      JSON.stringify({
        ...parsedEntity,
        timestamp,
      }),
    ),
    expiresIn: 30 * 1800 * 24, // 30d, block every 2 seconds
    attributes: [
      { key: "vanity_market_request", value: "4" },
      { key: "timestamp", value: timestamp },
    ],
    contentType: "application/json",
  });
}

export const NewOrderPage = () => {
  const { isConnected } = useAppKitAccount();
  const LOCAL_STORAGE_KEY = "vanity_last_public_key";
  const [savedPublicKey, setSavedPublicKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    mode: "onChange",
    defaultValues: {
      keyType: "publicKey",
      publicKey: "",
      duration: "5m",
      problems: {
        "leading-any": { enabled: false, length: 8 },
        "trailing-any": { enabled: false, length: 8 },
        "letters-heavy": { enabled: false, count: 32 },
        "numbers-heavy": { enabled: false },
        "snake-score-no-case": { enabled: false, count: 15 },
        "user-prefix": { enabled: false, specifier: "0xC0FFEE00" },
        "user-suffix": { enabled: false, specifier: "00BADD1E" },
        "user-mask": {
          enabled: false,
          specifier: "1234xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5678",
        },
      },
    },
  });

  const mutation = useMutation({
    mutationFn: sendOrder,
    onSuccess: (data) => {
      // persist last used public key
      try {
        const key = form.getValues("publicKey");
        if (key) {
          localStorage.setItem(LOCAL_STORAGE_KEY, key);
          setSavedPublicKey(key);
        }
      } catch {
        // ignore storage errors
      }
      form.reset();
      toast({
        title: "Order sent successfully!",
        variant: "success",
        button: {
          label: "View in block explorer",
          onClick: () => {
            window.open(
              `${import.meta.env.VITE_ARKIV_BLOCK_EXPLORER}/entity/${data.entityKey}?tab=data`,
              "_blank",
            );
          },
        },
      });
    },
    onError: (error) => {
      console.error("Error sending order:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Error sending order, check the console for more details",
        description:
          message.substring(0, 100) + (message.length > 100 ? "..." : ""),
        variant: "error",
      });
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    mutation.mutate(data);
  }

  const problems_watch = useWatch({ control: form.control, name: "problems" });
  const selectedProblems = problems_watch
    ? Object.entries(problems_watch)
        .filter(([, problem]) => problem.enabled)
        .map(
          ([key, value]) =>
            ({
              type: key,
              ...value,
            }) as Problem,
        )
    : [];

  const [examples, setExamples] = useState<Record<string, React.ReactNode>>(
    () => {
      const initialExamples: Record<string, React.ReactNode> = {};
      for (const problem of problems) {
        initialExamples[problem.id] = problem.getDefaultExample();
      }
      return initialExamples;
    },
  );

  const updateExample = (
    problemId: ProblemId,
    specifierValue: string | number,
  ) => {
    const problem = problemsById[problemId];
    if (
      problem.specifierType === "text" &&
      typeof specifierValue === "string"
    ) {
      setExamples((prev) => ({
        ...prev,
        [problemId]: problem.getExample(specifierValue),
      }));
    } else if (
      problem.specifierType === "number" &&
      typeof specifierValue === "number"
    ) {
      setExamples((prev) => ({
        ...prev,
        [problemId]: problem.getExample(specifierValue),
      }));
    }
  };

  const enableProblem = (problemId: ProblemId) => {
    form.setValue(`problems.${problemId}.enabled`, true, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const toggleProblem = (problemId: ProblemId) => {
    const fieldValue = form.getValues(`problems.${problemId}`);
    form.setValue(
      `problems.${problemId}`,
      { ...fieldValue, enabled: !fieldValue.enabled },
      {
        shouldValidate: true,
        shouldDirty: true,
      },
    );
  };

  const totalDifficulty = calculateWorkUnitForProblems(selectedProblems);

  const duration =
    useWatch({ control: form.control, name: "duration" }) || "30m";

  // Convert duration to minutes
  const durationSec = vanityDurationToSeconds(duration);

  // prettier-ignore
  const hashesPerDuration = 20 // 20 providers
    * 5 * 1e6 // 5 MH/s
    * durationSec // duration in seconds
    * (form.getValues("keyType") === "xpub" ? 0.1 : 1); // xpub is ~10% as effective as a single public key

  const expectedMatches = Math.round(
    selectedProblems.length > 0 && totalDifficulty > 0
      ? hashesPerDuration / totalDifficulty
      : 0,
  );

  const formFields = problems.reduce(
    (acc, problemConfig) => {
      acc[problemConfig.id] = (() => {
        switch (problemConfig.id) {
          case "leading-any":
          case "trailing-any":
            return (
              <FormField
                key={problemConfig.id}
                control={form.control}
                name={`problems.${problemConfig.id}.length`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Slider
                          min={problemConfig.min}
                          max={problemConfig.max}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            updateExample(problemConfig.id, value[0]);
                          }}
                          onPointerDown={() => {
                            enableProblem(problemConfig.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-8 text-center font-bold text-primary">
                          {field.value}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {problemConfig.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          case "letters-heavy":
          case "snake-score-no-case":
            return (
              <FormField
                key={problemConfig.id}
                control={form.control}
                name={`problems.${problemConfig.id}.count`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[field.value]}
                          onValueChange={(value) => {
                            field.onChange(value[0]);
                            updateExample(problemConfig.id, value[0]);
                          }}
                          onPointerDown={() => {
                            enableProblem(problemConfig.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          min={problemConfig.min}
                          max={problemConfig.max}
                          step={1}
                        />
                        <div className="w-8 text-center font-bold text-primary">
                          {field.value}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {problemConfig.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          case "user-prefix":
          case "user-suffix":
          case "user-mask":
            return (
              <FormField
                key={problemConfig.id}
                control={form.control}
                name={`problems.${problemConfig.id}.specifier`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specifier</FormLabel>
                    <FormControl>
                      <Input
                        value={field.value}
                        className="font-mono"
                        placeholder={problemConfig.defaultValue}
                        type="text"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={() => {
                          enableProblem(problemConfig.id);
                        }}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (problemConfig.id === "user-mask") {
                            value = value.replace(/[^0-9a-fA-FXx]/gi, "");
                          } else if (problemConfig.id === "user-prefix") {
                            if (value.length < 2) {
                              value = "0x";
                            } else {
                              value =
                                "0x" +
                                value
                                  .replace(/^0x/i, "")
                                  .replace(/[^0-9a-fA-F]/gi, "");
                            }
                          } else {
                            value = value.replace(/[^0-9a-fA-F]/gi, "");
                          }
                          value = value.slice(
                            0,
                            problemConfig.id === "user-prefix" ? 42 : 40,
                          );
                          if (field.value === value) return;
                          field.onChange(value);
                          updateExample(problemConfig.id, value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {problemConfig.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          default:
            return null;
        }
      })();
      return acc;
    },
    {} as Record<ProblemId, React.ReactNode>,
  );

  return (
    <div className="container flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Order</h1>
        <Button asChild>
          <Link to="/order">
            <ArrowLeft className="size-4" />
            Back to orders list
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <Alert variant="default" className="mb-2">
            <strong>Disclaimer:</strong> This is an alpha implementation of the
            orderbook system. Please use{" "}
            <span className="font-bold text-orange-600">
              testnet tokens only
            </span>
            . Orders will be handled by our nodes in a best-effort manner. There
            is no guarantee that your order will be fulfilled. Never share your
            private key. The public key you provide should correspond to a
            private key that you control, but the private key itself is never
            shared or transmitted.
          </Alert>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="keyType"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Key Input Type</FormLabel>
                      <KeyGuideSheet />
                    </div>
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField("publicKey");
                      }}
                    >
                      <TabsList>
                        <TabsTrigger value="publicKey">Public Key</TabsTrigger>
                        <TabsTrigger value="xpub">xpub</TabsTrigger>
                      </TabsList>
                      <TabsContent value="publicKey">
                        <FormField
                          control={form.control}
                          name="publicKey"
                          render={({ field: publicKeyField }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex flex-row gap-1">
                                  <Input
                                    placeholder="0x..."
                                    {...publicKeyField}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                      !savedPublicKey ||
                                      !savedPublicKey.startsWith("0x") ||
                                      publicKeyField.value === savedPublicKey
                                    }
                                    onClick={() => {
                                      publicKeyField.onChange(savedPublicKey);
                                      toast({
                                        title: "Public key inserted",
                                        description:
                                          "Make sure you control the corresponding private key.",
                                      });
                                    }}
                                  >
                                    Use previously saved key
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Enter your uncompressed public key (130 hex
                                characters after 0x prefix). This will be used
                                to derive addresses for vanity address
                                generation.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      <TabsContent value="xpub">
                        <FormField
                          control={form.control}
                          name="publicKey"
                          render={({ field: xpubField }) => (
                            <FormItem>
                              <FormControl>
                                <div className="flex flex-row gap-1">
                                  <Input placeholder="xpub..." {...xpubField} />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={
                                      !savedPublicKey ||
                                      !savedPublicKey.startsWith("xpub") ||
                                      xpubField.value === savedPublicKey
                                    }
                                    onClick={() => {
                                      xpubField.onChange(savedPublicKey);
                                      toast({
                                        title: "Public key inserted",
                                        description:
                                          "Make sure you control the corresponding private key.",
                                      });
                                    }}
                                  >
                                    Use previously saved key
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Enter your extended public key (xpub format, 111
                                characters). This allows derivation of multiple
                                addresses for vanity generation.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                    <FormDescription className="mt-2">
                      The key that the providers will use to search for vanity
                      addresses. Make sure you control the corresponding private
                      key. Keep it secure and never share it.
                    </FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="problems"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Patterns</FormLabel>
                      <FormDescription>
                        Select the patterns you want to order for solving.
                      </FormDescription>
                    </div>
                    <div className="space-y-3">
                      {problems.map((item) => {
                        const input = problems_watch[item.id];
                        const isSelected = input?.enabled;
                        const problemForDifficultyCalc = {
                          ...input,
                          type: item.id,
                        } as Problem;
                        const difficulty = calculateWorkUnitForProblems([
                          problemForDifficultyCalc,
                        ]);

                        return (
                          <Card
                            key={item.id}
                            className={cn(
                              "border-2 transition-all",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-muted hover:border-primary/40",
                            )}
                          >
                            <CardHeader>
                              <div
                                className="-m-2 w-full cursor-pointer rounded-md p-2 transition-colors hover:bg-muted/20"
                                onClick={() => {
                                  toggleProblem(item.id);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {isSelected ? (
                                    <CheckSquare2 className="size-6 text-primary" />
                                  ) : (
                                    <Square className="size-6 text-muted-foreground" />
                                  )}
                                  <div className="flex-1 text-left">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                      {item.icon}
                                      {item.label}
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                      {item.description}
                                    </CardDescription>
                                  </div>
                                  {isSelected && (
                                    <div className="hidden text-xs text-muted-foreground sm:block">
                                      {displayDifficulty(difficulty)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            {isSelected && (
                              <CardContent className="space-y-4 border-t pt-0">
                                <div className="space-y-4 pt-4">
                                  {formFields[item.id]}
                                  {examples[item.id] && (
                                    <div>
                                      <label className="text-sm font-medium">
                                        Example
                                      </label>
                                      <div className="mt-2 rounded-md bg-muted/50 p-3 font-mono text-sm break-all">
                                        {examples[item.id]}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <label className="text-sm font-medium">
                                      Difficulty
                                    </label>
                                    <label className="text-xs text-muted-foreground">
                                      How many addresses need to be checked to
                                      find one that matches the pattern?
                                    </label>
                                    <div className="mt-2 rounded-md bg-muted/50 p-3 font-mono text-sm break-all">
                                      {difficulty.toLocaleString()} (
                                      {displayDifficulty(difficulty)})
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-4 rounded-md border bg-muted/30 p-4">
                <h3 className="text-lg font-semibold">Total Difficulty</h3>
                <p className="text-sm text-foreground/80">
                  This is an estimate of how many addresses need to be checked
                  to find at least one that matches any of the selected
                  problems.
                </p>
                <p className="text-sm text-foreground/80">
                  The more problems you select, the easier it will be to match
                  any of them.
                </p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {selectedProblems.length === 0
                    ? "Select at least 1 problem"
                    : form.formState.errors.problems
                      ? "Fix problem configuration errors"
                      : displayDifficulty(totalDifficulty)}
                </p>
                <h3 className="mt-4 text-lg font-semibold">Time Estimation</h3>
                <p className="text-sm text-foreground/80">
                  With 20 providers working for {duration}, you can expect to
                  find approximately:
                </p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {selectedProblems.length === 0
                    ? "Select at least 1 problem"
                    : form.formState.errors.problems
                      ? "Fix problem configuration errors"
                      : expectedMatches.toLocaleString() +
                        " matching addresses"}
                </p>
                {expectedMatches < 100 && selectedProblems.length > 0 && (
                  <p className="mt-2 text-sm text-orange-500">
                    Warning: The expected number of matches is low. Consider
                    selecting easier problems for better results.
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Duration (human readable)</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        <input
                          style={{ padding: 10 }}
                          type={"text"}
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      How long should providers work on finding matching
                      addresses for your order.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={
                  mutation.isPending || !isConnected || !form.formState.isValid
                }
              >
                {mutation.isPending
                  ? "Sending Order..."
                  : !isConnected
                    ? "Connect wallet to send order"
                    : "Send Order"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
