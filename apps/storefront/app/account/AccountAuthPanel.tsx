"use client";

import { useState } from "react";
import { ActionForm } from "../components/ActionForm";
import { loginAction, registerAction } from "@/lib/actions";

type AuthMode = "login" | "register";

export function AccountAuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="账号操作">
        <button
          className={`tab${mode === "login" ? " active" : ""}`}
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          aria-controls="login-panel"
          id="login-tab"
          onClick={() => setMode("login")}
        >
          登录
        </button>
        <button
          className={`tab${mode === "register" ? " active" : ""}`}
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          aria-controls="register-panel"
          id="register-tab"
          onClick={() => setMode("register")}
        >
          注册会员
        </button>
      </div>

      {mode === "login" ? (
        <div id="login-panel" role="tabpanel" aria-labelledby="login-tab">
          <ActionForm action={loginAction} submitLabel="进入商城">
            <div className="field">
              <label htmlFor="account">手机号 / 邮箱</label>
              <input id="account" name="account" placeholder="请输入手机号或邮箱" autoComplete="username" />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input id="password" name="password" type="password" placeholder="请输入密码" autoComplete="current-password" />
            </div>
          </ActionForm>
        </div>
      ) : (
        <div id="register-panel" role="tabpanel" aria-labelledby="register-tab">
          <ActionForm action={registerAction} submitLabel="注册会员" variant="secondary">
            <div className="field">
              <label htmlFor="registerAccount">手机号 / 邮箱</label>
              <input id="registerAccount" name="account" placeholder="请输入手机号或邮箱" autoComplete="username" />
            </div>
            <div className="field">
              <label htmlFor="registerPassword">密码</label>
              <input id="registerPassword" name="password" type="password" placeholder="至少 6 位" autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="registerNickname">昵称</label>
              <input id="registerNickname" name="nickname" placeholder="填写你的昵称" autoComplete="nickname" />
            </div>
            <div className="field">
              <label htmlFor="registerPhone">联系电话</label>
              <input id="registerPhone" name="contactPhone" placeholder="用于订单和售后联系" autoComplete="tel" />
            </div>
            <div className="field">
              <label htmlFor="registerAddress">默认地址</label>
              <textarea id="registerAddress" name="defaultAddress" placeholder="填写常用收货地址" autoComplete="street-address" />
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
