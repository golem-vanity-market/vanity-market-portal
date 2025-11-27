import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  VanityRequestWithTimestamp,
  Problem,
} from "db-vanity-model/src/order-schema.ts";
import { problemsById } from "./problem-config";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, ExternalLink } from "lucide-react";
import { useExplorerUrl } from "./useExplorerUrl";

const getProblemDisplayName = (problem: Problem) => {
  const config = problemsById[problem.type];
  switch (problem.type) {
    case "user-prefix":
    case "user-suffix":
    case "user-mask":
      return `${config.label}: ${problem.specifier}`;
    case "leading-any":
    case "trailing-any":
      return `${config.label}: ${problem.length}`;
    case "letters-heavy":
    case "snake-score-no-case":
      return `${config.label}: ${problem.count}`;
    default:
      return config.label;
  }
};

export const OrderCard = ({
  id,
  order,
}: {
  id: string;
  order: VanityRequestWithTimestamp;
}) => {
  const explorerUrl = useExplorerUrl();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold">Order</span>
            <Badge variant="outline">
              {new Date(order.timestamp).toLocaleString()}
            </Badge>
          </div>
          <Badge>Pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-md font-medium">ID</h3>
            <p>
              <a
                href={`${explorerUrl}/entity/${id}?tab=data`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-sm text-muted-foreground underline"
              >
                {id}
                <ExternalLink className="size-4" />
              </a>
            </p>
          </div>
          <div>
            <h3 className="text-md font-medium">Public Key</h3>
            <p className="font-mono text-sm break-all text-muted-foreground">
              {order.publicKey}
            </p>
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                bounce="none"
                variant="ghost"
                size="sm"
                className="w-full justify-start px-0"
              >
                <ChevronsUpDown className="mr-2 h-4 w-4" />
                <h3 className="text-md font-medium">
                  Problems ({order.problems.length})
                </h3>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {order.problems.map((problem) => (
                <div key={problem.type} className="rounded-md bg-muted/50 p-2">
                  <p className="text-sm font-medium">
                    {getProblemDisplayName(problem)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {problemsById[problem.type].description}
                  </p>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};
