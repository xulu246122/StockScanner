package com.v65.android;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundAlertPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onBackPressed() {
        // 拦截 Android 系统返回手势与侧滑滑屏返回，弹出运行状态选择框
        showExitChoiceDialog();
    }

    public void showExitChoiceDialog() {
        runOnUiThread(() -> {
            if (isFinishing() || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1 && isDestroyed())) {
                return;
            }

            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setTitle("🛡️ StockScanner 运行选项");
            builder.setMessage("检测到滑屏返回操作，请选择接下来的运行状态：\n\n" +
                    "• 【后台运行】(推荐)：\n" +
                    "  程序保留在后台持续监控美股异动，并在 Android 顶部状态栏显示常驻守护图标，点击随时切回。\n\n" +
                    "• 【退出程序】：\n" +
                    "  停止所有实时行情扫描，彻底杀死程序进程。");

            builder.setPositiveButton("后台运行", (dialog, which) -> {
                dialog.dismiss();
                handleMoveToBackground();
            });

            builder.setNegativeButton("退出程序", (dialog, which) -> {
                dialog.dismiss();
                handleExitApp();
            });

            builder.setNeutralButton("取消", (dialog, which) -> {
                dialog.dismiss();
            });

            builder.setCancelable(true);

            AlertDialog dialog = builder.create();
            dialog.show();

            try {
                if (dialog.getButton(DialogInterface.BUTTON_POSITIVE) != null) {
                    dialog.getButton(DialogInterface.BUTTON_POSITIVE).setTextColor(Color.parseColor("#1A73E8")); // Google Blue
                }
                if (dialog.getButton(DialogInterface.BUTTON_NEGATIVE) != null) {
                    dialog.getButton(DialogInterface.BUTTON_NEGATIVE).setTextColor(Color.parseColor("#EA4335")); // Google Red
                }
                if (dialog.getButton(DialogInterface.BUTTON_NEUTRAL) != null) {
                    dialog.getButton(DialogInterface.BUTTON_NEUTRAL).setTextColor(Color.parseColor("#5F6368")); // Google Gray
                }
            } catch (Exception ignored) {}
        });
    }

    public void handleMoveToBackground() {
        try {
            Intent serviceIntent = new Intent(this, StockScannerForegroundService.class);
            serviceIntent.putExtra("interval_seconds", 30);
            serviceIntent.putExtra("bg_mode", true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Toast.makeText(this, "🛡️ StockScanner 已转入后台守护，顶部状态栏持续监控中", Toast.LENGTH_SHORT).show();
            moveTaskToBack(true);
        } catch (Exception e) {
            moveTaskToBack(true);
        }
    }

    public void handleExitApp() {
        try {
            Intent serviceIntent = new Intent(this, StockScannerForegroundService.class);
            serviceIntent.setAction("ACTION_STOP");
            startService(serviceIntent);
        } catch (Exception ignored) {}
        finishAffinity();
        android.os.Process.killProcess(android.os.Process.myPid());
        System.exit(0);
    }
}
