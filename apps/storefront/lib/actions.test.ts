import { beforeEach, describe, expect, it, vi } from "vitest";
import { reviewAction, type ActionState } from "./actions";

const mocks = vi.hoisted(() => ({
  getMallWriteService: vi.fn(),
  revalidatePath: vi.fn(),
  requireActorId: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn()
}));

vi.mock("./session", () => ({
  clearSessionUser: vi.fn(),
  requireActorId: mocks.requireActorId,
  setSessionUser: vi.fn()
}));

vi.mock("./services/mall-service", () => ({
  getMallWriteService: mocks.getMallWriteService
}));

const initialState: ActionState = {
  ok: false,
  message: ""
};

function makeReviewForm() {
  const formData = new FormData();
  formData.set("orderItemId", "item-review-1");
  formData.set("rating", "5");
  formData.set("content", "确认收货后评价会同步到详情页。");
  return formData;
}

describe("server actions", () => {
  beforeEach(() => {
    mocks.getMallWriteService.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.requireActorId.mockReset();
  });

  it("revalidates product detail pages after a successful review", async () => {
    const submitReview = vi.fn().mockResolvedValue("评价已提交，商品评分已更新");
    mocks.requireActorId.mockResolvedValue("user-customer-1");
    mocks.getMallWriteService.mockReturnValue({ submitReview });

    await expect(reviewAction(initialState, makeReviewForm())).resolves.toEqual({
      ok: true,
      message: "评价已提交，商品评分已更新"
    });

    expect(submitReview).toHaveBeenCalledWith({
      userId: "user-customer-1",
      orderItemId: "item-review-1",
      rating: 5,
      content: "确认收货后评价会同步到详情页。"
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/orders");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/after-sale");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/products/[id]", "page");
  });
});
