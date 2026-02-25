package validator

import (
	"testing"

	v "github.com/go-playground/validator/v10"
)

type mockFieldError struct {
	tag   string
	field string
	param string
	v.FieldError
}

func (m mockFieldError) Tag() string   { return m.tag }
func (m mockFieldError) Field() string { return m.field }
func (m mockFieldError) Param() string { return m.param }

func TestTranslate(t *testing.T) {
	tests := []struct {
		name string
		fe   mockFieldError
		want string
	}{
		{
			name: "required",
			fe:   mockFieldError{tag: "required", field: "Email"},
			want: "Email is required",
		},
		{
			name: "email",
			fe:   mockFieldError{tag: "email", field: "Email"},
			want: "Invalid email format",
		},
		{
			name: "min",
			fe:   mockFieldError{tag: "min", field: "Password", param: "8"},
			want: "Password must be at least 8 characters",
		},
		{
			name: "max",
			fe:   mockFieldError{tag: "max", field: "Username", param: "20"},
			want: "Username must be at most 20 characters",
		},
		{
			name: "eqfield",
			fe:   mockFieldError{tag: "eqfield", field: "ConfirmPassword", param: "Password"},
			want: "Confirm password must match password",
		},
		{
			name: "len",
			fe:   mockFieldError{tag: "len", field: "Code", param: "6"},
			want: "Code must be exactly 6 characters",
		},
		{
			name: "gte",
			fe:   mockFieldError{tag: "gte", field: "Age", param: "18"},
			want: "Age must be greater than or equal to 18",
		},
		{
			name: "lte",
			fe:   mockFieldError{tag: "lte", field: "Age", param: "100"},
			want: "Age must be less than or equal to 100",
		},
		{
			name: "numeric",
			fe:   mockFieldError{tag: "numeric", field: "PhoneNumber"},
			want: "Phone number must be a number",
		},
		{
			name: "unknown tag falls to default",
			fe:   mockFieldError{tag: "uuid", field: "ProfileId"},
			want: "Profile id is invalid",
		},
		{
			name: "camelCase field humanized",
			fe:   mockFieldError{tag: "required", field: "FirstName"},
			want: "First name is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Translate(tt.fe)
			if got != tt.want {
				t.Errorf("Translate() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestHumanizeField(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"FirstName", "first name"},
		{"Email", "email"},
		{"PhoneNumber", "phone number"},
		{"ID", "i d"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := humanizeField(tt.input)
			if got != tt.want {
				t.Errorf("humanizeField(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestCapitalizeFirst(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"hello", "Hello"},
		{"Hello", "Hello"},
		{"", ""},
		{"a", "A"},
		{"already Capital", "Already Capital"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := capitalizeFirst(tt.input)
			if got != tt.want {
				t.Errorf("capitalizeFirst(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
