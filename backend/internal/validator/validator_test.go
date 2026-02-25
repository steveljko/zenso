package validator

import "testing"

func TestNew(t *testing.T) {
	v := New()
	if v == nil {
		t.Fatal("New() returned nil")
	}
	if v.validator == nil {
		t.Fatal("New() validator field is nil")
	}
}

func TestValidate(t *testing.T) {
	type RegisterInput struct {
		Email    string `validate:"required,email"`
		Password string `validate:"required,min=8"`
		Age      int    `validate:"gte=18,lte=100"`
	}

	tests := []struct {
		name       string
		input      any
		wantErrors map[string]string
	}{
		{
			name: "valid struct returns empty map",
			input: RegisterInput{
				Email:    "alice@example.com",
				Password: "securepass",
				Age:      25,
			},
			wantErrors: map[string]string{},
		},
		{
			name: "missing required fields",
			input: RegisterInput{
				Age: 25,
			},
			wantErrors: map[string]string{
				"email":    "Email is required",
				"password": "Password is required",
			},
		},
		{
			name: "invalid email format",
			input: RegisterInput{
				Email:    "not-an-email",
				Password: "securepass",
				Age:      25,
			},
			wantErrors: map[string]string{
				"email": "Invalid email format",
			},
		},
		{
			name: "password too short",
			input: RegisterInput{
				Email:    "alice@example.com",
				Password: "short",
				Age:      25,
			},
			wantErrors: map[string]string{
				"password": "Password must be at least 8 characters",
			},
		},
		{
			name: "age below minimum",
			input: RegisterInput{
				Email:    "alice@example.com",
				Password: "securepass",
				Age:      15,
			},
			wantErrors: map[string]string{
				"age": "Age must be greater than or equal to 18",
			},
		},
		{
			name: "multiple errors at once",
			input: RegisterInput{
				Email:    "bad-email",
				Password: "hi",
				Age:      15,
			},
			wantErrors: map[string]string{
				"email":    "Invalid email format",
				"password": "Password must be at least 8 characters",
				"age":      "Age must be greater than or equal to 18",
			},
		},
	}

	v := New()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := v.Validate(tt.input)

			if len(got) != len(tt.wantErrors) {
				t.Errorf("Validate() returned %d errors, want %d: got %v", len(got), len(tt.wantErrors), got)
				return
			}
			for field, wantMsg := range tt.wantErrors {
				gotMsg, ok := got[field]
				if !ok {
					t.Errorf("Validate() missing error for field %q", field)
					continue
				}
				if gotMsg != wantMsg {
					t.Errorf("Validate() field %q = %q, want %q", field, gotMsg, wantMsg)
				}
			}
		})
	}
}

func TestAddError(t *testing.T) {
	tests := []struct {
		name    string
		initial map[string]string
		field   string
		message string
		want    map[string]string
	}{
		{
			name:    "adds to existing map",
			initial: map[string]string{"email": "Email is required"},
			field:   "username",
			message: "Username is taken",
			want: map[string]string{
				"email":    "Email is required",
				"username": "Username is taken",
			},
		},
		{
			name:    "nil map initializes and adds",
			initial: nil,
			field:   "email",
			message: "Email already exists",
			want: map[string]string{
				"email": "Email already exists",
			},
		},
		{
			name:    "overwrites existing field",
			initial: map[string]string{"email": "old message"},
			field:   "email",
			message: "new message",
			want: map[string]string{
				"email": "new message",
			},
		},
		{
			name:    "empty map adds entry",
			initial: map[string]string{},
			field:   "phone",
			message: "Phone number must be a number",
			want: map[string]string{
				"phone": "Phone number must be a number",
			},
		},
	}

	v := New()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := v.AddError(tt.initial, tt.field, tt.message)

			if len(got) != len(tt.want) {
				t.Errorf("AddError() returned %d entries, want %d", len(got), len(tt.want))
				return
			}
			for field, wantMsg := range tt.want {
				gotMsg, ok := got[field]
				if !ok {
					t.Errorf("AddError() missing key %q", field)
					continue
				}
				if gotMsg != wantMsg {
					t.Errorf("AddError() field %q = %q, want %q", field, gotMsg, wantMsg)
				}
			}
		})
	}
}
