import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Github,
  LayoutGrid,
  Lock,
  Terminal,
} from "lucide-react";
import { Link } from "react-router-dom";
import { assetsUrl } from "./utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "./components/ui/label";
import { CheckedState } from "@radix-ui/react-checkbox";

const randomizeCase = (s: string) =>
  s
    .split("")
    .map((c) => (Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase()))
    .join("");

const CodeBlock = ({ title, code }: { title: string; code: string }) => {
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code.trim());
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <div className="relative rounded-lg border bg-muted font-mono text-sm">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={copyToClipboard}
        >
          <span className="sr-only">Copy</span>
          {hasCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <pre className="overflow-x-auto p-4">{code.trim()}</pre>
      </div>
    </div>
  );
};

const Welcome = () => {
  const generateMockAddress = (p: string, isCaseSensitive: boolean) => {
    const cleanPrefix = isCaseSensitive ? p : randomizeCase(p);
    const remaining = 40 - cleanPrefix.length;
    const randomPart = Array(remaining)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("");
    return (
      <span>
        0x<span className="text-primary">{cleanPrefix}</span>
        {randomPart.toLowerCase()}
      </span>
    );
  };
  const [state, setState] = useState<{
    prefix: string;
    address: React.ReactNode;
    isCaseSensitive: boolean;
  }>({
    prefix: "CAFE",
    address: generateMockAddress("CAFE", false),
    isCaseSensitive: false,
  });

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 12);
    setState((prev) => {
      if (sanitizedValue === prev.prefix) {
        return prev;
      }
      return {
        ...prev,
        prefix: sanitizedValue,
        address: generateMockAddress(sanitizedValue, prev.isCaseSensitive),
      };
    });
  };

  const handleCaseSensitivityChange = (e: CheckedState) => {
    const isChecked = e === true;
    setState((prev) => {
      if (isChecked === prev.isCaseSensitive) {
        return prev;
      }
      return {
        ...prev,
        isCaseSensitive: isChecked,
        address: generateMockAddress(prev.prefix, isChecked),
      };
    });
  };

  const computeDifficulty = (prefix: string, isCaseSensitive: boolean) => {
    const baseDifficulty = 16 ** prefix.length;
    if (!isCaseSensitive) return baseDifficulty;
    const caseSensitiveChars = prefix
      .split("")
      .filter((c) => /[a-fA-F]/.test(c)).length;
    return baseDifficulty * 2 ** caseSensitiveChars;
  };

  const lightLogo = assetsUrl() + "logo_light.svg";
  const darkLogo = assetsUrl() + "logo_dark.svg";

  return (
    <main className="container mx-auto px-4 py-12 md:py-20">
      <section className="relative mb-24 text-center">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
        <div className="flex flex-col items-center justify-center md:flex-row">
          <img
            src={lightLogo}
            alt="Logo"
            className="hidden h-32 w-32 lg:h-48 lg:w-48 dark:block"
          />
          <img
            src={darkLogo}
            alt="Logo"
            className="block h-32 w-32 lg:h-48 lg:w-48 dark:hidden"
          />
          <h1 className="font-heading text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            Vanity <br /> Market
          </h1>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
          A decentralized solution for generating personalized Ethereum vanity
          addresses built on top of{" "}
          <Link
            style={{ fontWeight: "bold" }}
            to={"https://golem.network"}
            target="_blank"
            rel="noreferrer"
          >
            Golem Network
          </Link>{" "}
          and{" "}
          <Link
            style={{ fontWeight: "bold" }}
            to={"https://arkiv.network"}
            target="_blank"
            rel="noreferrer"
          >
            [ ARKIV ]
          </Link>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" asChild>
            <a href="#get-started">Get Started</a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link
              to="https://github.com/orgs/golem-vanity-market/repositories"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="mr-2 h-4 w-4" />
              View on GitHub
            </Link>
          </Button>
        </div>

        <div className="mx-auto mt-16 max-w-2xl">
          <Card className="text-left shadow-lg">
            <CardHeader>
              <CardTitle>See it in Action</CardTitle>
              <CardDescription>
                Enter a hexadecimal prefix (0-9, a-f, A-F) to display a sample:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col justify-between gap-4 sm:flex-row md:flex-row md:items-center">
                <div className="flex flex-row items-center gap-2">
                  <span className="font-mono text-muted-foreground">0x</span>
                  <Input
                    value={state.prefix}
                    onChange={handlePrefixChange}
                    placeholder="CAFE"
                    className="w-40 font-mono text-lg"
                    maxLength={12}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <Checkbox
                    id="case-sensitive"
                    checked={state.isCaseSensitive}
                    onCheckedChange={handleCaseSensitivityChange}
                  />
                  <Label htmlFor="case-sensitive">Case Sensitive</Label>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-muted p-4">
                <p className="font-mono text-sm break-all md:text-base">
                  {state.address}
                </p>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Difficulty: Approx. 1 in{" "}
                  <span className="font-semibold text-primary">
                    {computeDifficulty(
                      state.prefix,
                      state.isCaseSensitive,
                    ).toLocaleString("en-US")}
                  </span>{" "}
                  combinations
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mb-24 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <CardHeader>
            <Database className="mb-4 h-8 w-8 text-primary" />
            <CardTitle>Provider Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Explore a database of providers stored reliably on Golem Base. See
              who computes the most hashes, offers the best prices, and more.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" className="w-full" asChild>
              <Link to="/providers">View Provider Stats</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <CardHeader>
            <Terminal className="mb-4 h-8 w-8 text-primary" />
            <CardTitle>Powerful CLI Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Our CLI allows you to generate addresses from your terminal with
              advanced pattern matching, budget management, and CPU/GPU support.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="secondary" className="w-full" asChild>
              <Link
                to="https://github.com/golem-vanity-market/golem-vanity-market-cli"
                target="_blank"
                rel="noreferrer"
              >
                Use the CLI
              </Link>
            </Button>
          </CardFooter>
        </Card>
        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
          <CardHeader>
            <LayoutGrid className="mb-4 h-8 w-8 text-primary" />
            <CardTitle>Web Interface (Soon)</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              A brand new web interface is coming soon to allow you to submit
              your vanity address requests directly from your browser.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-24">
        <Card className="bg-muted/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Secure by Design
            </CardTitle>
            <CardDescription className="mx-auto max-w-2xl pt-2 text-base">
              Our non-custodial process ensures you are the only one who ever
              has access to the final private key. Your initial secret is never
              revealed.
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-6 grid gap-8 md:grid-cols-2">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                1
              </div>
              <div>
                <h4 className="font-semibold">Generate Your Master Key</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  On <span className="font-bold">your local machine</span>, you
                  generate a primary private key. Think of this as your unique
                  &quot;master secret.&quot; It must never be shared and{" "}
                  <span className="font-bold text-foreground">
                    it never leaves your computer.
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                2
              </div>
              <div>
                <h4 className="font-semibold">Broadcast the Public Task</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  You send{" "}
                  <span className="font-bold">only the public key</span> derived
                  from your master secret to the Golem Network, along with your
                  desired address pattern (e.g., `0xCAFE...`).
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                3
              </div>
              <div>
                <h4 className="font-semibold">
                  The Network Hunts for a &quot;Salt&quot;
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Providers on the network search for a special number (a
                  &quot;salt&quot;). The goal is to find a salt that, when
                  mathematically combined with your public key, results in an
                  Ethereum address that matches your pattern.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
                4
              </div>
              <div>
                <h4 className="font-semibold">Create the Final Key Locally</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Once a provider finds the correct salt, it&apos;s sent back to
                  you. You then combine this salt with your{" "}
                  <span className="font-bold">original master private key</span>{" "}
                  on your machine. This creates the final, complete private key
                  for your new vanity address.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="mt-4 flex justify-center rounded-b-lg bg-muted p-4">
            <p className="text-center font-semibold text-primary">
              <CheckCircle2 className="mr-2 inline h-5 w-5" />
              The final private key is only ever assembled on your device.
            </p>
          </CardFooter>
        </Card>
      </section>

      <section id="get-started">
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Get Started with the CLI
            </CardTitle>
            <CardDescription>
              Install the tool and generate your first vanity address in
              minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <CodeBlock
              title="1. Installation"
              code={`
git clone https://github.com/golem-vanity-market/golem-vanity-market-cli.git
cd golem-vanity-market-cli/
npm install && npm run build
            `}
            />
            <CodeBlock
              title="2. Generate Keys"
              code={`
openssl ecparam -name secp256k1 -genkey -noout -out ec_private.pem
openssl ec -in ec_private.pem -pubout -outform DER | tail -c 65 | xxd -p -c 65 > my-key.public
            `}
            />
            <CodeBlock
              title="3. Run the Generator"
              code={`
npm run start -- generate \\
  --public-key ./my-key.public \\
  --vanity-address-prefix 0x123456 \\
  --budget-limit 10
            `}
            />
          </CardContent>
        </Card>
      </section>
    </main>
  );
};
export default Welcome;
