#include <stdio.h>
#include <ctype.h>
#include <string.h>
typedef struct{
    char name[30];
} City;
int isVowel(char ch){
    ch = tolower(ch);
    return (ch == 'a' || ch == 'e' || ch == 'i' || ch == 'o' || ch == 'u');
}
void displayFilteredCities( City arr[], int size){
    for (int i =0; i<size; i++){
        char firstChar = arr[i].name[0];
        int len = strlen(arr[i].name);
        char lastChar = arr[i].name[len -1];
        if( isalpha(firstChar) && !isVowel(firstChar) && isVowel(lastChar)){
            printf("%s \n", arr[i].name);
        }
    }
}
int main() {
    City Cities[12];
    printf("Enter 12 city names:\n");
    for(int i =0; i <12; i++){
        printf("City %d: ", i+1);
        fgets(Cities[i].name, sizeof(Cities[i].name), stdin);
        int len = strlen(Cities[i].name);
        if (len >0 && Cities[i].name[len-1] == '\n'){
            Cities[i].name[len - 1] = '\0';
        }
    }
     printf("\nCities starting with a consonant and ending with a vowel:\n");
    printf("----------------------------------------------------------\n");

    displayFilteredCities(Cities, 12);
     
    printf("\nAll Entered Cities:\n");
    printf("-------------------\n");
    for(int i = 0; i < 12; i++) {
        // %s prints the entire string stored in the .name array
        printf("%s\n", Cities[i].name); 
    }
    return 0;

    return 0;
}