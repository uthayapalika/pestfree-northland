import 'package:flutter/material.dart';

// Shared Pest-Free website palette.
const forest = Color(0xFF08110F);
const leaf = Color(0xFFBAFF63);
const cream = Color(0xFF08110F);
const ink = Color(0xFFF1F7F2);
const muted = Color(0xFFA1B4A9);
const cardSurface = Color(0xFF12201B);
const fieldSurface = Color(0xFF0D1915);
const borderColor = Color(0xFF263832);
const accentSoft = Color(0xFF263D2B);

ThemeData buildPestFreeTheme() => ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: cream,
      colorScheme: ColorScheme.fromSeed(
        seedColor: forest,
        brightness: Brightness.dark,
        primary: leaf,
        onPrimary: forest,
        secondary: Color(0xFF42DF91),
        surface: cardSurface,
        onSurface: ink,
        error: Color(0xFFE5534B),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: cream,
        foregroundColor: ink,
        elevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: TextStyle(
          color: ink,
          fontSize: 21,
          fontWeight: FontWeight.w800,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: fieldSurface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
        labelStyle: const TextStyle(color: muted),
        prefixIconColor: muted,
        suffixIconColor: muted,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: leaf, width: 1.5),
        ),
      ),
      cardTheme: CardThemeData(
        color: cardSurface,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: leaf,
          foregroundColor: forest,
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: fieldSurface,
        indicatorColor: accentSoft,
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
              color: states.contains(WidgetState.selected) ? leaf : muted,
              fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
              fontSize: 11,
            )),
        iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
              color: states.contains(WidgetState.selected) ? leaf : muted,
            )),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: cardSurface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
      ),
      dividerColor: borderColor,
    );
