export interface ZokoAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ZokoCustomer {
  id: string;
  name: string;
  channel: string;
  channelId: string;
}

export interface ZokoCustomerPage {
  pageSize: number;
  currentPage: number;
  totalPages: number;
  totalCustomers: number;
  customers: ZokoCustomer[];
}

export interface ZokoMessage {
  key: {
    customerId: string;
    platformTimestamp: string;
    msgId: string;
  };
  direction: string;
  fileCaption: string | null;
  fileUrl: string | null;
  platform: string;
  platformTimestamp: string;
  text: string | null;
  type: string;
  zokoAgent: string | null;
  deliveryStatus?: string | null;
}

export interface ZokoSendMessageResponse {
  status: string;
  statusText: string;
  messageId: string;
}

export class ZokoApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZokoApiError";
  }
}

export class ZokoClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined,
    private readonly requestDelayMs: number,
  ) {}

  private lastRequestAt = 0;

  listAgents(): Promise<ZokoAgent[]> {
    return this.request<ZokoAgent[]>("agent/agents");
  }

  listCustomers(page: number): Promise<ZokoCustomerPage> {
    return this.request<ZokoCustomerPage>(
      `customer?channel=whatsapp&includeAssign=true&page=${page}`,
    );
  }

  listCustomerMessages(customerId: string): Promise<ZokoMessage[]> {
    return this.request<ZokoMessage[]>(
      `customer/${encodeURIComponent(customerId)}/messages`,
    );
  }

  async sendTextMessage(
    recipient: string,
    message: string,
  ): Promise<ZokoSendMessageResponse> {
    return this.request<ZokoSendMessageResponse>("message", {
      method: "POST",
      body: {
        channel: "whatsapp",
        recipient,
        type: "text",
        message,
      },
    });
  }

  private async request<T>(
    path: string,
    options: { method?: "GET" | "POST"; body?: unknown } = {},
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error("ZOKO_API_KEY is required for Zoko operations");
    }

    const waitMs = this.requestDelayMs - (Date.now() - this.lastRequestAt);
    console.log(`Waiting ${Math.max(waitMs, 0)}ms before Zoko request`);
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    this.lastRequestAt = Date.now();

    const url = `${this.baseUrl}/${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      apikey: this.apiKey,
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      throw new ZokoApiError(
        `Zoko request failed with status ${response.status}`,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ZokoApiError("Zoko returned invalid JSON");
    }
  }
}
