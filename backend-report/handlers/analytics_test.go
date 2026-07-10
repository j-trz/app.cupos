package handlers

import (
	"testing"
	"time"

	"backend-go/models"
)

func TestNormalize(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"áéreo", "aereo"},
		{"  VERANO  2026  ", "verano 2026"},
		{"Semana Santa; Verano", "semana santa; verano"},
		{"", ""},
	}

	for _, tc := range tests {
		actual := normalize(tc.input)
		if actual != tc.expected {
			t.Errorf("normalize(%q) = %q; expected %q", tc.input, actual, tc.expected)
		}
	}
}

func TestCanonicalTipoProducto(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"ch", "CHARTERS"},
		{"charter-1", "CHARTERS"},
		{"aereo", "CUPOS"},
		{"dest_arg", "DESTINO ARG"},
		{"Random", "RANDOM"},
	}

	for _, tc := range tests {
		actual := canonicalTipoProducto(tc.input)
		if actual != tc.expected {
			t.Errorf("canonicalTipoProducto(%q) = %q; expected %q", tc.input, actual, tc.expected)
		}
	}
}

func TestCumpleEdadMenor2Anios(t *testing.T) {
	birth := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	returnDate1 := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC) // 1 year old
	returnDate2 := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC) // 2.4 years old

	if !cumpleEdadMenor2Anios(birth, returnDate1) {
		t.Error("expected true for 1 year old infant")
	}

	if cumpleEdadMenor2Anios(birth, returnDate2) {
		t.Error("expected false for 2.4 years old child")
	}
}

func TestIsPassengerSale(t *testing.T) {
	p1 := models.Passenger{Nro: 1}
	if !isPassengerSale(p1, time.Now()) {
		t.Error("passenger with Nro=1 should always be counted as a sale")
	}

	p2 := models.Passenger{
		Nro:        0,
		Nacimiento: time.Now().AddDate(-1, 0, 0), // 1 year old
	}
	if !isPassengerSale(p2, time.Now()) {
		t.Error("infant passenger with Nro=0 should be counted as a sale")
	}

	p3 := models.Passenger{
		Nro:        0,
		Nacimiento: time.Now().AddDate(-3, 0, 0), // 3 years old
	}
	if isPassengerSale(p3, time.Now()) {
		t.Error("child passenger with Nro=0 and age >= 2 should not be counted as a sale")
	}
}

func TestIsTienda(t *testing.T) {
	if !isTienda("Tienda") {
		t.Error("expected 'Tienda' to be classified as Tienda Viajes")
	}
	if !isTienda("Tienda Viajes SRL") {
		t.Error("expected 'Tienda Viajes SRL' to be classified as Tienda Viajes")
	}
	if isTienda("Jetmar") {
		t.Error("expected 'Jetmar' to not be classified as Tienda")
	}
}
