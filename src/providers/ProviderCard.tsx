import type { ProviderDataEntry } from "db-vanity-model/src/provider";
import {
  CircleDollarSign,
  Cpu,
  ExternalLink,
  GaugeCircle,
  Hash,
  Timer,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExplorerUrl } from "@/order/useExplorerUrl";
import { displayDifficulty, displayHours } from "@/utils";
import { getProviderScore } from "./provider-utils";

const getScoreClassName = (score: number) => {
  if (score > 75) return "text-green-600 bg-green-100";
  if (score > 40) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
};

interface ProviderCardProps {
  provider: ProviderDataEntry;
  rank: number;
}

export const ProviderCard = ({ provider, rank }: ProviderCardProps) => {
  const score = getProviderScore(provider);
  const explorerUrl = useExplorerUrl();

  const metrics = [
    {
      label: "Work Hours",
      description: "The total time the provider has been active and working.",
      icon: <Timer className="size-4" />,
      allTime: displayHours(provider.totalWorkHours),
      h24: displayHours(provider.totalWorkHours24h),
    },
    {
      label: "Work Done",
      description:
        "The total number of addresses that the provider has searched.",
      icon: <Cpu className="size-4" />,
      allTime: displayDifficulty(provider.totalWork),
      h24: displayDifficulty(provider.totalWork24h),
    },
    {
      label: "Total Cost",
      description: "The total cost of the work done by the provider.",
      icon: <CircleDollarSign className="size-4" />,
      allTime: `${provider.totalCost.toFixed(4)} GLM`,
      h24: `${provider.totalCost24h.toFixed(4)} GLM`,
    },
    {
      label: "Speed",
      description:
        "The provider's speed in terms of addresses searched per second.",
      icon: <GaugeCircle className="size-4" />,
      allTime: `${displayDifficulty(provider.speed)}/s`,
      h24: `${displayDifficulty(provider.speed24h)}/s`,
    },
    {
      label: "Efficiency",
      description:
        "The provider's efficiency in terms of addresses searched per GLM.",
      icon: <TrendingUp className="size-4" />,
      allTime: `${displayDifficulty(provider.efficiency)}/GLM`,
      h24: `${displayDifficulty(provider.efficiency24h)}/GLM`,
    },
    {
      label: "Jobs",
      description:
        "The total number of unique agreements that were made with this provider.",
      icon: <Hash className="size-4" />,
      allTime: provider.numberOfJobs,
      h24: provider.numberOfJobs24h,
    },
    {
      label: "Longest Job",
      description:
        "The duration of the longest agreement made with this provider.",
      icon: <Timer className="size-4" />,
      allTime: displayHours(provider.longestJob),
      h24: displayHours(provider.longestJob24h),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <span className="text-muted-foreground">#{rank}</span>
              <a
                href={`https://stats.golem.network/network/provider/${provider.providerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-lg text-primary underline"
              >
                {provider.providerName}
                <ExternalLink className="size-4" />
              </a>
            </CardTitle>
            <CardDescription className="pt-1 font-mono text-xs break-all">
              <Link
                target={"_blank"}
                to={`/provider?providerId=${provider.providerId}`}
              >
                {provider.providerId} Details
              </Link>
            </CardDescription>
            <CardDescription className="pt-1 font-mono text-xs break-all">
              <a
                href={`${explorerUrl}/entity/${provider.key}?tab=data`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary underline"
              >
                {provider.key}
              </a>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger>
                  <Badge className={getScoreClassName(score)}>
                    {score.toFixed(1)}% Score
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {`The score is calculated based on the provider's speed and efficiency. A high score indicates good
                      overall performance and cost-effectiveness.`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">All Time</TableHead>
              <TableHead className="text-right">Last 24h</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((metric) => (
              <TableRow key={metric.label}>
                <TableCell className="font-medium">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {metric.icon}
                          <span className="text-card-foreground">
                            {metric.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{metric.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right">{metric.allTime}</TableCell>
                <TableCell className="text-right">{metric.h24}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
